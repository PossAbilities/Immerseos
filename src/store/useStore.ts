import { create } from 'zustand';
import type { Collection, Experience, RoomPatch, RoomState, SceneParams } from '@/lib/types';
import {
  BUILTIN_COLLECTION,
  BUILTIN_EXPERIENCES,
  loadCollections,
  loadUserExperiences,
  saveCollections,
  saveUserExperiences,
} from '@/data/experiences';
import { CLIENT_ID, Sync, nextMessageId } from '@/lib/sync';
import { emitSurfaceTouch } from '@/lib/touchBus';
import { applySets, initialAtoms, resetSceneAtoms } from '@/lib/atoms';
import type { AtomSet } from '@/lib/types';

export interface AppState extends RoomState {
  experiences: Experience[];
  collections: Collection[];
  authed: boolean;
  operator: string;
  // remote connectivity, reported by the sync layer
  remotesConnected: number;

  // actions
  signIn: (operator: string) => void;
  signOut: () => void;
  patch: (p: RoomPatch, broadcast?: boolean) => void;
  loadExperience: (id: string) => void;
  goLive: (live: boolean) => void;
  togglePlay: () => void;
  setParam: (key: keyof SceneParams, value: number) => void;
  setActiveScene: (sceneId: string) => void;
  applyAtomSets: (sets: AtomSet[] | undefined) => void;
  addExperience: (exp: Experience) => void;
  deleteExperience: (id: string) => void;
  cloneExperience: (id: string) => Experience | undefined;
  addCollection: (name: string) => Collection;
  deleteCollection: (id: string) => void;
  tick: (dt: number) => void;
}

let sync: Sync | null = null;

/** Wire a transport into the store so external surfaces stay in sync. */
export function attachSync(s: Sync) {
  sync = s;
  s.on((msg) => {
    if (msg.kind === 'patch' && msg.patch) {
      useStore.getState().patch(msg.patch, false);
    } else if (msg.kind === 'hello') {
      // a new surface connected — push it the full state so it catches up
      const st = useStore.getState();
      s.send({ kind: 'state', id: nextMessageId(), origin: CLIENT_ID, state: snapshot(st) });
    } else if (msg.kind === 'state' && msg.state) {
      useStore.getState().patch(msg.state, false);
    } else if (msg.kind === 'presence' && typeof msg.remotes === 'number') {
      // the relay is the source of truth for how many phones are connected
      useStore.setState({ remotesConnected: msg.remotes });
    } else if (msg.kind === 'touch' && msg.touch) {
      // a surface touch from the control surface — fan out to the local bus
      emitSurfaceTouch(msg.touch);
    }
  });
}

/** Broadcast a routed surface touch to the other surfaces (projection/remote). */
export function broadcastTouch(touch: import('@/lib/sensors').SurfaceTouch) {
  sync?.send({ kind: 'touch', id: nextMessageId(), origin: CLIENT_ID, touch });
}

function snapshot(s: RoomState): RoomState {
  return {
    currentId: s.currentId,
    activeExperience: s.activeExperience,
    activeSceneId: s.activeSceneId,
    live: s.live,
    playing: s.playing,
    positionSec: s.positionSec,
    volume: s.volume,
    muted: s.muted,
    lighting: s.lighting,
    lightIntensity: s.lightIntensity,
    params: s.params,
    atoms: s.atoms,
    updatedAt: s.updatedAt,
  };
}

const first = BUILTIN_EXPERIENCES[0];

export const useStore = create<AppState>((set, get) => ({
  // ---- room state ----
  currentId: first.id,
  live: false,
  playing: false,
  positionSec: 0,
  volume: 65,
  muted: false,
  lighting: 'ambient',
  lightIntensity: 82,
  params: { ...first.params },
  atoms: {},
  updatedAt: Date.now(),

  // ---- app state ----
  experiences: [...BUILTIN_EXPERIENCES, ...loadUserExperiences()],
  collections: [BUILTIN_COLLECTION, ...loadCollections()],
  authed: false,
  operator: '',
  remotesConnected: 0,

  signIn: (operator) => set({ authed: true, operator }),
  signOut: () => set({ authed: false, operator: '' }),

  patch: (p, broadcast = true) => {
    set({ ...p, updatedAt: Date.now() });
    if (broadcast && sync) {
      sync.send({ kind: 'patch', id: nextMessageId(), origin: CLIENT_ID, patch: p });
    }
  },

  loadExperience: (id) => {
    const exp = get().experiences.find((e) => e.id === id);
    if (!exp) return;
    get().patch({
      currentId: id,
      activeExperience: exp, // so projection/remote can render content they don't own
      activeSceneId: exp.scenes?.[0]?.id,
      atoms: initialAtoms(exp.atoms),
      positionSec: 0,
      playing: get().live,
      params: { ...exp.params },
    });
  },

  setActiveScene: (sceneId) => {
    const exp = currentExperience(get());
    get().patch({ activeSceneId: sceneId, atoms: resetSceneAtoms(get().atoms ?? {}, exp.atoms) });
  },

  applyAtomSets: (sets) => {
    if (!sets?.length) return;
    get().patch({ atoms: applySets(get().atoms ?? {}, sets) });
  },

  goLive: (live) => get().patch({ live, playing: live }),

  togglePlay: () => get().patch({ playing: !get().playing }),

  setParam: (key, value) =>
    get().patch({ params: { ...get().params, [key]: value } }),

  addExperience: (exp) =>
    set((s) => {
      const experiences = [...s.experiences.filter((e) => e.id !== exp.id), exp];
      saveUserExperiences(experiences);
      return { experiences };
    }),

  deleteExperience: (id) =>
    set((s) => {
      const experiences = s.experiences.filter((e) => e.id !== id || e.builtIn);
      saveUserExperiences(experiences);
      return { experiences };
    }),

  cloneExperience: (id) => {
    const src = get().experiences.find((e) => e.id === id);
    if (!src) return undefined;
    const copy: Experience = {
      ...structuredClone(src),
      id: `user-${Date.now()}`,
      title: `${src.title} (copy)`,
      builtIn: false,
      createdAt: Date.now(),
    };
    get().addExperience(copy);
    return copy;
  },

  addCollection: (name) => {
    const col: Collection = { id: `col-${Date.now()}`, name, createdAt: Date.now() };
    set((s) => {
      const collections = [...s.collections, col];
      saveCollections(collections);
      return { collections };
    });
    return col;
  },

  deleteCollection: (id) =>
    set((s) => {
      if (id === BUILTIN_COLLECTION.id) return {};
      const collections = s.collections.filter((c) => c.id !== id);
      // orphaned experiences fall back to "no collection"
      const experiences = s.experiences.map((e) =>
        e.collectionId === id ? { ...e, collectionId: undefined } : e,
      );
      saveCollections(collections);
      saveUserExperiences(experiences);
      return { collections, experiences };
    }),

  tick: (dt) => {
    const s = get();
    if (!s.playing) return;
    const exp = s.experiences.find((e) => e.id === s.currentId);
    const dur = exp?.durationSec ?? 480;
    let pos = s.positionSec + dt;
    if (pos >= dur) pos = 0; // loop experiences seamlessly
    // advance locally only; position is derived, no need to spam the network
    set({ positionSec: pos });
  },
}));

export function currentExperience(s: AppState): Experience {
  // Prefer the window's own (always-fresh) copy; fall back to the broadcast
  // snapshot for surfaces that don't have this experience in their library
  // (e.g. the projection window showing an authored experience made on control).
  return (
    s.experiences.find((e) => e.id === s.currentId) ??
    (s.activeExperience?.id === s.currentId ? s.activeExperience : BUILTIN_EXPERIENCES[0])
  );
}
