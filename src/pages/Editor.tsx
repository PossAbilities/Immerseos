import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { SurfaceView } from '@/components/SurfaceView';
import { GlassPanel, PrimaryButton, SectionLabel, Slider } from '@/components/ui';
import { useStore, currentExperience } from '@/store/useStore';
import { useRoomProfile } from '@/lib/roomBridge';
import { EDITOR_SURFACES, getScenes, newElement, newScene } from '@/lib/sceneModel';
import { SCENES } from '@/engine/scenes';
import { ACTIVITIES } from '@/activities/registry';
import { cn } from '@/lib/cn';
import type { ElementType, Experience, Scene, SceneElement, SurfaceContent } from '@/lib/types';

const TOOLS: { type: ElementType; icon: string; label: string }[] = [
  { type: 'image', icon: 'image', label: 'Image' },
  { type: 'text', icon: 'title', label: 'Text' },
  { type: 'hotspot', icon: 'touch_app', label: 'Hotspot' },
  { type: 'video', icon: 'movie', label: 'Video' },
  { type: 'web', icon: 'public', label: 'Web View' },
  { type: 'activity', icon: 'sports_esports', label: 'Activity' },
  { type: 'lock', icon: 'lock', label: 'Lock' },
  { type: 'wipe', icon: 'auto_fix_high', label: 'Wipe' },
  { type: 'timer', icon: 'timer', label: 'Timer' },
  { type: 'score', icon: 'tag', label: 'Score' },
  { type: 'progress', icon: 'linear_scale', label: 'Progress' },
];

const ASPECTS = ['16:9', '16:10', '4:3', '1:1', '32:9'];
const ratioCss = (r?: string) => (r ? r.replace(':', ' / ') : '16 / 9');

function readFile(accept: string, onDone: (dataUrl: string) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = () => {
    const f = input.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => onDone(r.result as string);
    r.readAsDataURL(f);
  };
  input.click();
}

export function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fromStore = useStore(currentExperience);
  const experiences = useStore((s) => s.experiences);
  const addExperience = useStore((s) => s.addExperience);
  const loadExperience = useStore((s) => s.loadExperience);
  const goLive = useStore((s) => s.goLive);
  const setActiveScene = useStore((s) => s.setActiveScene);

  const operator = useStore((s) => s.operator);
  const { profile } = useRoomProfile();

  // A fresh blank experience for the "new" route (sidebar → Creator).
  const [blank] = useState<Experience>(() => ({
    id: `user-${Date.now()}`,
    title: 'Untitled Experience',
    category: 'Generative',
    sceneId: SCENES[0].id,
    tagline: 'Custom build',
    description: '',
    accent: SCENES[0].accent,
    durationSec: 480,
    builtIn: false,
    createdAt: Date.now(),
    params: { ...SCENES[0].defaults },
    layers: [],
    owner: operator,
    contentType: 'Interactive',
    isNew: true,
    scenes: [newScene('Scene 1', SCENES[0].id)],
  }));
  const exp = useMemo(
    () => (id && id !== 'new' ? (experiences.find((e) => e.id === id) ?? fromStore) : blank),
    [experiences, id, fromStore, blank],
  );

  // The editor simulates the *actual* room: only the walls/floor the room layout
  // has enabled (1/2/3 walls + floor/ceiling), falling back to a default set.
  const roomSurfaces = useMemo(
    () =>
      (profile?.surfaces.filter((s) => s.enabled) ?? EDITOR_SURFACES.map((s) => ({ ...s, enabled: true }))).map(
        (s) => ({ id: s.id, label: s.label }),
      ),
    [profile],
  );
  const walls = roomSurfaces.filter((s) => s.id !== 'floor' && s.id !== 'ceiling');
  const floor = roomSurfaces.find((s) => s.id === 'floor');
  const ceiling = roomSurfaces.find((s) => s.id === 'ceiling');

  // Built-ins can't be overwritten (saveUserExperiences drops them), so editing
  // one authors a persistent user copy under a fresh, stable id.
  const [targetId] = useState(() => (exp.builtIn ? `user-${Date.now()}` : exp.id));
  const [scenes, setScenes] = useState<Scene[]>(() => structuredClone(getScenes(exp)));
  const [sceneIdx, setSceneIdx] = useState(0);
  const [surfaceId, setSurfaceId] = useState('centre');
  const [selId, setSelId] = useState<string | null>(null);
  const [view, setView] = useState<'flat' | '3d'>('flat');
  const [saved, setSaved] = useState(true);
  const [audioTrack, setAudioTrack] = useState<string | undefined>(exp.audioTrack);
  const [aspect, setAspect] = useState<string>(exp.aspectRatio ?? '16:9');

  // keep the selected surface valid for the current room layout
  useEffect(() => {
    if (!roomSurfaces.some((s) => s.id === surfaceId)) {
      setSurfaceId(walls[0]?.id ?? roomSurfaces[0]?.id ?? 'centre');
      setSelId(null);
    }
  }, [roomSurfaces, surfaceId, walls]);

  const scene = scenes[sceneIdx] ?? scenes[0];
  const selected = selId ? scene.surfaces[surfaceId]?.elements.find((e) => e.id === selId) : undefined;

  const mutate = (fn: (s: Scene) => Scene) => {
    setScenes((list) => list.map((s, i) => (i === sceneIdx ? fn(structuredClone(s)) : s)));
    setSaved(false);
  };
  const mutateSurface = (sid: string, fn: (c: SurfaceContent) => SurfaceContent) =>
    mutate((s) => ({ ...s, surfaces: { ...s.surfaces, [sid]: fn(s.surfaces[sid] ?? { elements: [] }) } }));
  const patchElement = (elId: string, patch: Partial<SceneElement>) =>
    mutateSurface(surfaceId, (c) => ({ ...c, elements: c.elements.map((e) => (e.id === elId ? { ...e, ...patch } : e)) }));

  const addElement = (type: ElementType) => {
    const el = newElement(type);
    mutateSurface(surfaceId, (c) => ({ ...c, elements: [...c.elements, el] }));
    setSelId(el.id);
  };

  const duplicateScene = (i: number) => {
    setScenes((l) => {
      const src = structuredClone(l[i]);
      const rid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      src.id = `scene-${rid()}`;
      src.name = `${src.name} copy`;
      for (const sid of Object.keys(src.surfaces)) {
        src.surfaces[sid].elements = src.surfaces[sid].elements.map((e) => ({
          ...e,
          id: `${e.type}-${rid()}`,
        }));
      }
      const next = [...l];
      next.splice(i + 1, 0, src);
      return next;
    });
    setSaved(false);
  };
  const thumbSurface = walls[0]?.id ?? 'centre';

  const build = (): Experience => ({
    ...exp,
    id: targetId,
    builtIn: false,
    owner: exp.owner ?? operator,
    scenes,
    audioTrack,
    aspectRatio: aspect,
  });
  const save = () => { addExperience(build()); setSaved(true); };
  const deploy = () => {
    const e = build();
    addExperience(e);
    loadExperience(e.id);
    goLive(true);
    setActiveScene(scenes[0].id);
    navigate(`/app/experience/${e.id}`);
  };

  return (
    <div className="flex h-screen flex-col p-margin">
      <header className="mb-md flex items-center justify-between">
        <div className="flex items-center gap-md">
          <button onClick={() => navigate('/app/library')} className="text-on-surface-variant hover:text-primary"><Icon name="arrow_back" /></button>
          <div>
            <h2 className="text-headline-md">{exp.title}</h2>
            <p className="text-label-sm text-on-surface-variant">Wall Editor · {scenes.length} scene{scenes.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-base">
          <select
            value={aspect}
            onChange={(e) => { setAspect(e.target.value); setSaved(false); }}
            className="glass rounded-lg px-sm py-1.5 text-label-sm outline-none"
            title="Surface aspect ratio"
          >
            {ASPECTS.map((a) => <option key={a} value={a}>{a}{a === '32:9' ? ' (wide)' : ''}</option>)}
          </select>
          <div className="glass flex rounded-lg p-1">
            <button onClick={() => setView('flat')} className={cn('rounded px-sm py-1 text-label-sm', view === 'flat' && 'bg-primary text-on-primary')}>Flat View</button>
            <button onClick={() => setView('3d')} className={cn('rounded px-sm py-1 text-label-sm', view === '3d' && 'bg-primary text-on-primary')}>Virtual Room</button>
          </div>
          <button onClick={save} className="glass flex items-center gap-base rounded-lg px-md py-sm text-label-md hover:bg-white/10">
            <Icon name={saved ? 'check' : 'save'} size={18} /> {saved ? 'Saved' : 'Save'}
          </button>
          <PrimaryButton className="flex items-center gap-base py-sm" onClick={deploy}><Icon name="cast" size={18} /> Deploy</PrimaryButton>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-gutter">
        {/* left: scenes + tools */}
        <GlassPanel className="col-span-2 flex flex-col gap-md overflow-y-auto p-md custom-scrollbar">
          <div>
            <div className="mb-sm flex items-center justify-between">
              <SectionLabel>Scenes</SectionLabel>
              <button onClick={() => { setScenes((l) => [...l, newScene(`Scene ${l.length + 1}`, SCENES[0].id)]); setSaved(false); }} className="text-on-surface-variant hover:text-primary"><Icon name="add" size={18} /></button>
            </div>
            <div className="space-y-base">
              {scenes.map((s, i) => (
                <div key={s.id} className={cn('overflow-hidden rounded-lg border', i === sceneIdx ? 'border-primary' : 'border-white/10')}>
                  <button onClick={() => { setSceneIdx(i); setSelId(null); }} className="block aspect-video w-full">
                    <SurfaceView content={s.surfaces[thumbSurface] ?? { elements: [] }} editable className="pointer-events-none h-full w-full" />
                  </button>
                  <div className="flex items-center gap-1 px-1 py-0.5">
                    <span className="flex-1 truncate text-[11px]">{s.name}</span>
                    <button onClick={() => duplicateScene(i)} className="text-outline hover:text-primary" title="Duplicate"><Icon name="content_copy" size={13} /></button>
                    {scenes.length > 1 && (
                      <button onClick={() => { setScenes((l) => l.filter((_, j) => j !== i)); setSceneIdx(0); setSelId(null); setSaved(false); }} className="text-outline hover:text-error" title="Delete"><Icon name="close" size={13} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <input
              value={scene.name}
              onChange={(e) => mutate((s) => ({ ...s, name: e.target.value }))}
              className="mt-sm w-full rounded bg-surface-container-low p-1 text-label-sm outline-none"
              placeholder="Scene name"
            />
          </div>

          <div>
            <SectionLabel>Add to “{roomSurfaces.find((s) => s.id === surfaceId)?.label ?? surfaceId}”</SectionLabel>
            <div className="mt-sm grid grid-cols-2 gap-base">
              {TOOLS.map((t) => (
                <button key={t.type} onClick={() => addElement(t.type)} className="glass flex flex-col items-center gap-1 rounded-lg p-sm text-label-sm hover:bg-white/10">
                  <Icon name={t.icon} size={20} className="text-primary" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Background Audio</SectionLabel>
            <div className="mt-sm flex items-center gap-base">
              <button
                onClick={() => readFile('audio/*', (url) => { setAudioTrack(url); setSaved(false); })}
                className="glass flex flex-1 items-center justify-center gap-base rounded-lg p-sm text-label-sm hover:bg-white/10"
              >
                <Icon name={audioTrack ? 'graphic_eq' : 'upload'} size={18} className="text-secondary" />
                {audioTrack ? 'Replace track' : 'Upload audio'}
              </button>
              {audioTrack && (
                <button onClick={() => { setAudioTrack(undefined); setSaved(false); }} className="text-outline hover:text-error"><Icon name="close" size={16} /></button>
              )}
            </div>
          </div>

          <div>
            <SectionLabel>Scene Settings</SectionLabel>
            <label className="mt-sm block text-label-sm text-on-surface-variant">Auto-advance after (seconds, 0 = off)</label>
            <input
              type="number"
              min={0}
              value={scene.autoAdvanceSec ?? 0}
              onChange={(e) => { const v = Number(e.target.value); mutate((s) => ({ ...s, autoAdvanceSec: v > 0 ? v : undefined })); }}
              className="mt-xs w-full rounded-lg bg-surface-container-low p-sm text-label-md outline-none focus:ring-1 focus:ring-primary"
            />
            {scene.autoAdvanceSec ? (
              <>
                <label className="mt-sm block text-label-sm text-on-surface-variant">Then go to</label>
                <select
                  value={scene.nextSceneId ?? ''}
                  onChange={(e) => mutate((s) => ({ ...s, nextSceneId: e.target.value || undefined }))}
                  className="mt-xs w-full rounded-lg bg-surface-container-low p-sm text-label-md outline-none"
                >
                  <option value="">Next scene</option>
                  {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </>
            ) : null}
          </div>
        </GlassPanel>

        {/* centre: surfaces */}
        <div className="col-span-7 overflow-auto rounded-xl bg-black/40 p-md custom-scrollbar">
          {view === 'flat' ? (
            <div className="flex h-full flex-col gap-sm">
              {ceiling && (
                <SurfacePane label={ceiling.label} active={surfaceId === ceiling.id} onPick={() => { setSurfaceId(ceiling.id); setSelId(null); }} className="h-20">
                  <SurfaceView content={scene.surfaces[ceiling.id] ?? { elements: [] }} surface={ceiling.id} editable selectedId={surfaceId === ceiling.id ? selId : null} onSelectElement={setSelId} onMoveElement={(eid, x, y) => patchElement(eid, { x, y })} className="h-full w-full" />
                </SurfacePane>
              )}
              <div className="flex flex-1 items-stretch gap-sm overflow-x-auto custom-scrollbar">
                {walls.map((s) => (
                  <SurfacePane key={s.id} label={s.label} active={surfaceId === s.id} onPick={() => { setSurfaceId(s.id); setSelId(null); }} className="h-full shrink-0" style={{ aspectRatio: ratioCss(aspect) }}>
                    <SurfaceView content={scene.surfaces[s.id] ?? { elements: [] }} surface={s.id} editable selectedId={surfaceId === s.id ? selId : null} onSelectElement={setSelId} onMoveElement={(eid, x, y) => patchElement(eid, { x, y })} className="h-full w-full" />
                  </SurfacePane>
                ))}
                {walls.length === 0 && <div className="flex flex-1 items-center justify-center text-label-sm text-on-surface-variant">No walls in this room layout — enable surfaces in Room Setup.</div>}
              </div>
              {floor && (
                <SurfacePane label={floor.label} active={surfaceId === floor.id} onPick={() => { setSurfaceId(floor.id); setSelId(null); }} className="h-32">
                  <SurfaceView content={scene.surfaces[floor.id] ?? { elements: [] }} surface={floor.id} editable selectedId={surfaceId === floor.id ? selId : null} onSelectElement={setSelId} onMoveElement={(eid, x, y) => patchElement(eid, { x, y })} className="h-full w-full" />
                </SurfacePane>
              )}
            </div>
          ) : (
            <VirtualRoom scene={scene} walls={walls.map((w) => w.id)} hasFloor={!!floor} onPick={(sid) => { setSurfaceId(sid); setSelId(null); }} />
          )}
        </div>

        {/* right: inspector */}
        <GlassPanel className="col-span-3 overflow-y-auto p-md custom-scrollbar">
          {selected ? (
            <ElementInspector el={selected} scenes={scenes} onChange={(p) => patchElement(selected.id, p)} onDelete={() => { mutateSurface(surfaceId, (c) => ({ ...c, elements: c.elements.filter((e) => e.id !== selected.id) })); setSelId(null); }} />
          ) : (
            <BackgroundInspector content={scene.surfaces[surfaceId] ?? { elements: [] }} label={roomSurfaces.find((s) => s.id === surfaceId)?.label ?? surfaceId} onChange={(p) => mutateSurface(surfaceId, (c) => ({ ...c, ...p }))} />
          )}
        </GlassPanel>
      </div>
    </div>
  );
}

function SurfacePane({ label, active, onPick, className, style, children }: { label: string; active: boolean; onPick: () => void; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-lg border', active ? 'border-primary' : 'border-white/10', className)} style={style} onPointerDown={onPick}>
      <div className="flex items-center justify-between bg-surface-container-high/60 px-sm py-1 text-[11px] uppercase tracking-widest text-on-surface-variant">
        {label}
        {active && <Icon name="edit" size={12} className="text-primary" />}
      </div>
      <div className="relative flex-1">{children}</div>
    </div>
  );
}

/** A CSS-3D approximation of the room for the "Virtual Room" preview. */
function VirtualRoom({ scene, walls, hasFloor, onPick }: { scene: Scene; walls: string[]; hasFloor: boolean; onPick: (sid: string) => void }) {
  const wall = 'absolute h-[60%] w-[40%] origin-center overflow-hidden';
  const has = (id: string) => walls.includes(id);
  return (
    <div className="flex h-full items-center justify-center" style={{ perspective: '1200px' }}>
      <div className="relative h-[70%] w-[70%]" style={{ transformStyle: 'preserve-3d' }}>
        {has('left') && (
          <div className={cn(wall, 'left-0 top-[20%]')} style={{ transform: 'rotateY(38deg) translateZ(-40px)' }} onPointerDown={() => onPick('left')}>
            <SurfaceView content={scene.surfaces.left ?? { elements: [] }} surface="left" className="h-full w-full" />
          </div>
        )}
        {has('centre') && (
          <div className="absolute left-[30%] top-[20%] h-[60%] w-[40%] overflow-hidden" onPointerDown={() => onPick('centre')}>
            <SurfaceView content={scene.surfaces.centre ?? { elements: [] }} surface="centre" className="h-full w-full" />
          </div>
        )}
        {has('right') && (
          <div className={cn(wall, 'right-0 top-[20%]')} style={{ transform: 'rotateY(-38deg) translateZ(-40px)' }} onPointerDown={() => onPick('right')}>
            <SurfaceView content={scene.surfaces.right ?? { elements: [] }} surface="right" className="h-full w-full" />
          </div>
        )}
        {hasFloor && (
          <div className="absolute bottom-0 left-[20%] h-[28%] w-[60%] overflow-hidden" style={{ transform: 'rotateX(58deg)' }} onPointerDown={() => onPick('floor')}>
            <SurfaceView content={scene.surfaces.floor ?? { elements: [] }} surface="floor" className="h-full w-full" />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-label-sm text-on-surface-variant">{label}</span>
      <div className="mt-xs">{children}</div>
    </label>
  );
}

function ElementInspector({ el, scenes, onChange, onDelete }: { el: SceneElement; scenes: Scene[]; onChange: (p: Partial<SceneElement>) => void; onDelete: () => void }) {
  const input = 'w-full rounded-lg bg-surface-container-low p-sm text-label-md outline-none focus:ring-1 focus:ring-primary';
  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <SectionLabel>{el.type} element</SectionLabel>
        <button onClick={onDelete} className="text-outline hover:text-error"><Icon name="delete" size={18} /></button>
      </div>

      {el.type === 'text' && (
        <>
          <Field label="Text"><textarea value={el.text} onChange={(e) => onChange({ text: e.target.value })} rows={2} className={input} /></Field>
          <Field label="Colour"><input type="color" value={el.color ?? '#ffffff'} onChange={(e) => onChange({ color: e.target.value })} className="h-9 w-full rounded bg-surface-container-low" /></Field>
          <Field label={`Size ${Math.round((el.fontSize ?? 0.12) * 100)}`}><Slider value={el.fontSize ?? 0.12} min={0.04} max={0.4} step={0.01} onChange={(v) => onChange({ fontSize: v })} /></Field>
        </>
      )}

      {(el.type === 'image' || el.type === 'video') && (
        <Field label="Source">
          <div className="flex gap-base">
            <input value={el.src ?? ''} onChange={(e) => onChange({ src: e.target.value })} placeholder="URL…" className={input} />
            <button onClick={() => readFile(el.type === 'image' ? 'image/*' : 'video/*', (url) => onChange({ src: url }))} className="glass rounded-lg px-sm hover:bg-white/10"><Icon name="upload" size={18} /></button>
          </div>
        </Field>
      )}

      {el.type === 'web' && <Field label="Web address"><input value={el.src ?? ''} onChange={(e) => onChange({ src: e.target.value })} className={input} /></Field>}

      {el.type === 'activity' && (
        <Field label="Activity">
          <select value={el.activityId ?? 'particles'} onChange={(e) => onChange({ activityId: e.target.value })} className={input}>
            {ACTIVITIES.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.category}</option>)}
          </select>
        </Field>
      )}

      {(el.type === 'timer' || el.type === 'progress') && (
        <Field label={`Duration (seconds)`}>
          <input type="number" min={1} value={el.duration ?? 30} onChange={(e) => onChange({ duration: Number(e.target.value) })} className={input} />
        </Field>
      )}

      {el.type === 'score' && (
        <Field label="Label"><input value={el.label ?? ''} onChange={(e) => onChange({ label: e.target.value })} className={input} /></Field>
      )}

      {el.type === 'lock' && (
        <>
          <Field label="Lock type">
            <select value={el.lockKind ?? 'numberpad'} onChange={(e) => onChange({ lockKind: e.target.value as SceneElement['lockKind'] })} className={input}>
              <option value="numberpad">Numberpad</option>
              <option value="sliding">Sliding</option>
              <option value="descramble">Descramble</option>
            </select>
          </Field>
          <Field label="Unlock code"><input value={el.code ?? ''} onChange={(e) => onChange({ code: e.target.value })} className={input} /></Field>
          <Field label="On unlock → go to scene">
            <select value={el.targetSceneId ?? ''} onChange={(e) => onChange({ targetSceneId: e.target.value || undefined })} className={input}>
              <option value="">(nothing)</option>
              {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </>
      )}

      {el.type === 'wipe' && (
        <Field label="Hidden image">
          <div className="flex gap-base">
            <input value={el.src ?? ''} onChange={(e) => onChange({ src: e.target.value })} placeholder="URL…" className={input} />
            <button onClick={() => readFile('image/*', (url) => onChange({ src: url }))} className="glass rounded-lg px-sm hover:bg-white/10"><Icon name="upload" size={18} /></button>
          </div>
        </Field>
      )}

      {(el.type === 'timer' || el.type === 'progress' || el.type === 'score' || el.type === 'lock' || el.type === 'wipe') && (
        <Field label="Colour"><input type="color" value={el.color ?? '#adc6ff'} onChange={(e) => onChange({ color: e.target.value })} className="h-9 w-full rounded bg-surface-container-low" /></Field>
      )}

      {el.type === 'hotspot' && (
        <>
          <Field label="Label"><input value={el.label ?? ''} onChange={(e) => onChange({ label: e.target.value })} className={input} /></Field>
          <Field label="Colour"><input type="color" value={el.color ?? '#adc6ff'} onChange={(e) => onChange({ color: e.target.value })} className="h-9 w-full rounded bg-surface-container-low" /></Field>
          <Field label="On tap → go to scene">
            <select value={el.targetSceneId ?? ''} onChange={(e) => onChange({ targetSceneId: e.target.value || undefined })} className={input}>
              <option value="">(nothing)</option>
              {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </>
      )}

      <div className="grid grid-cols-2 gap-base border-t border-white/5 pt-md">
        <Field label={`Width ${Math.round(el.w * 100)}%`}><Slider value={el.w} min={0.05} max={1} step={0.01} onChange={(v) => onChange({ w: v })} /></Field>
        <Field label={`Height ${Math.round(el.h * 100)}%`}><Slider value={el.h} min={0.05} max={1} step={0.01} onChange={(v) => onChange({ h: v })} /></Field>
      </div>
    </div>
  );
}

function BackgroundInspector({ content, label, onChange }: { content: SurfaceContent; label: string; onChange: (p: Partial<SurfaceContent>) => void }) {
  const input = 'w-full rounded-lg bg-surface-container-low p-sm text-label-md outline-none focus:ring-1 focus:ring-primary';
  return (
    <div className="space-y-md">
      <SectionLabel>{label} · background</SectionLabel>
      <p className="text-label-sm text-on-surface-variant">Select a surface tile in the canvas, then set its background and add elements.</p>
      <Field label="Generative scene">
        <select value={content.backgroundSrc ? '' : content.backgroundSceneId ?? ''} onChange={(e) => onChange({ backgroundSceneId: e.target.value || undefined, backgroundSrc: undefined })} className={input}>
          <option value="">(none)</option>
          {SCENES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Field>
      <Field label="…or image / video">
        <div className="flex gap-base">
          <input value={content.backgroundSrc ?? ''} onChange={(e) => onChange({ backgroundSrc: e.target.value || undefined, backgroundSceneId: undefined })} placeholder="URL…" className={input} />
          <button onClick={() => readFile('image/*,video/*', (url) => onChange({ backgroundSrc: url, backgroundSceneId: undefined }))} className="glass rounded-lg px-sm hover:bg-white/10"><Icon name="upload" size={18} /></button>
        </div>
      </Field>
      {content.backgroundSrc && /\.(mp4|mov|webm|ogg)(\?|$)/i.test(content.backgroundSrc) && (
        <label className="flex items-center gap-sm text-label-md">
          <input type="checkbox" checked={content.backgroundMuted ?? true} onChange={(e) => onChange({ backgroundMuted: e.target.checked })} className="h-4 w-4 accent-primary" />
          Mute background video
        </label>
      )}
      {(content.backgroundSrc || content.backgroundSceneId) && (
        <button onClick={() => onChange({ backgroundSrc: undefined, backgroundSceneId: undefined })} className="text-label-sm text-error hover:underline">Clear background</button>
      )}
    </div>
  );
}
