import { create } from 'zustand';
import type { Experience, RoomPatch, RoomState, SceneParams } from '@/lib/types';
import { getScene } from '@/engine/scenes';
import {
  BUILTIN_EXPERIENCES,
  loadUserExperiences,
  saveUserExperiences,
} from '@/data/experiences';
import { CLIENT_ID, Sync } from '@/lib/sync';

interface AppState extends RoomState {
  experiences: Experience[];
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
  addExperience: (exp: Experience) => void;
  deleteExperience: (id: string) => void;
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
      // a new surface connected — push it the full state
      const st = useStore.getState();
      s.send({ kind: 'state', origin: CLIENT_ID, state: snapshot(st) });
      useStore.setState((p) => ({ remotesConnected: p.remotesConnected + 1 }));
    } else if (msg.kind === 'state' && msg.state) {
      useStore.getState().patch(msg.state, false);
    }
  });
}

function snapshot(s: RoomState): RoomState {
  return {
    currentId: s.currentId,
    live: s.live,
    playing: s.playing,
    positionSec: s.positionSec,
    volume: s.volume,
    muted: s.muted,
    lighting: s.lighting,
    lightIntensity: s.lightIntensity,
    params: s.params,
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
  updatedAt: Date.now(),

  // ---- app state ----
  experiences: [...BUILTIN_EXPERIENCES, ...loadUserExperiences()],
  authed: false,
  operator: '',
  remotesConnected: 0,

  signIn: (operator) => set({ authed: true, operator }),
  signOut: () => set({ authed: false, operator: '' }),

  patch: (p, broadcast = true) => {
    set({ ...p, updatedAt: Date.now() });
    if (broadcast && sync) {
      sync.send({ kind: 'patch', origin: CLIENT_ID, patch: p });
    }
  },

  loadExperience: (id) => {
    const exp = get().experiences.find((e) => e.id === id);
    if (!exp) return;
    get().patch({
      currentId: id,
      positionSec: 0,
      playing: get().live,
      params: { ...exp.params },
    });
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
  return s.experiences.find((e) => e.id === s.currentId) ?? BUILTIN_EXPERIENCES[0];
}

export function currentScene(s: AppState) {
  return getScene(currentExperience(s).sceneId);
}
