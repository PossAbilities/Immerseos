import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { SurfaceView } from '@/components/SurfaceView';
import { PrimaryButton, Slider } from '@/components/ui';
import { useStore, currentExperience } from '@/store/useStore';
import { useRoomProfile } from '@/lib/roomBridge';
import { EDITOR_SURFACES, getScenes, newElement, newScene, panoramaStyle, wallContent } from '@/lib/sceneModel';
import { SCENES } from '@/engine/scenes';
import { ACTIVITIES } from '@/activities/registry';
import { cn } from '@/lib/cn';
import type { BackgroundType, ElementType, Experience, Scene, SceneElement, SurfaceContent } from '@/lib/types';

const ASPECTS = ['16:9', '16:10', '4:3', '1:1', '32:9'];
const ratioCss = (r?: string) => (r ? r.replace(':', ' / ') : '16 / 9');

const BG_TYPES: { id: BackgroundType; label: string }[] = [
  { id: 'per-surface', label: 'Per Surface' },
  { id: 'flat-panorama', label: 'Flat Panorama' },
  { id: 'equirectangular', label: 'Equirectangular' },
  { id: 'immersive-panorama', label: 'Immersive Panorama' },
  { id: 'immersive-cube', label: 'Immersive Cube' },
  { id: 'youtube-equiangular', label: 'YouTube Equiangular' },
  { id: 'streetview', label: 'Streetview' },
  { id: 'colour', label: 'Colour' },
  { id: 'use-previous', label: 'Use Previous' },
];

// bottom content dock + left "atoms"/"scene items" tool sets
const DOCK: { type: ElementType; icon: string; label: string }[] = [
  { type: 'hotspot', icon: 'touch_app', label: 'Hotspot' },
  { type: 'image', icon: 'image', label: 'Image' },
  { type: 'text', icon: 'title', label: 'Text Box' },
  { type: 'lock', icon: 'lock', label: 'Lock' },
];
const ATOM_TOOLS: { type: ElementType; icon: string; label: string }[] = [
  { type: 'timer', icon: 'timer', label: 'Timer' },
  { type: 'score', icon: 'tag', label: 'Score' },
  { type: 'progress', icon: 'linear_scale', label: 'Progress' },
  { type: 'wipe', icon: 'auto_fix_high', label: 'Wipe' },
];
const ITEM_TOOLS: { type: ElementType; icon: string; label: string }[] = [
  { type: 'video', icon: 'movie', label: 'Video' },
  { type: 'web', icon: 'public', label: 'Web View' },
  { type: 'activity', icon: 'sports_esports', label: 'Activity' },
];

const RAIL: { id: PanelId; icon: string; label: string }[] = [
  { id: 'scenes', icon: 'collections', label: 'Scenes' },
  { id: 'experience', icon: 'settings', label: 'Experience' },
  { id: 'scene', icon: 'tune', label: 'Scene Settings' },
  { id: 'theme', icon: 'palette', label: 'Theme' },
  { id: 'atoms', icon: 'category', label: 'Atoms' },
  { id: 'items', icon: 'widgets', label: 'Scene Items' },
];
type PanelId = 'scenes' | 'experience' | 'scene' | 'theme' | 'atoms' | 'items';

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
const rid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

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

  const [blank] = useState<Experience>(() => ({
    id: `user-${Date.now()}`, title: 'Untitled Experience', category: 'Generative', sceneId: SCENES[0].id,
    tagline: 'Custom build', description: '', accent: SCENES[0].accent, durationSec: 480, builtIn: false,
    createdAt: Date.now(), params: { ...SCENES[0].defaults }, layers: [], owner: operator,
    contentType: 'Interactive', isNew: true, scenes: [newScene('Scene 1', SCENES[0].id)],
  }));
  const exp = useMemo(
    () => (id && id !== 'new' ? (experiences.find((e) => e.id === id) ?? fromStore) : blank),
    [experiences, id, fromStore, blank],
  );

  const roomSurfaces = useMemo(
    () =>
      (profile?.surfaces.filter((s) => s.enabled) ?? EDITOR_SURFACES.map((s) => ({ ...s, enabled: true }))).map(
        (s) => ({ id: s.id, label: s.label }),
      ),
    [profile],
  );
  const walls = roomSurfaces.filter((s) => s.id !== 'floor' && s.id !== 'ceiling');
  const floor = roomSurfaces.find((s) => s.id === 'floor');

  const [targetId] = useState(() => (exp.builtIn ? `user-${Date.now()}` : exp.id));
  const [title, setTitle] = useState(exp.title);
  const [category, setCategory] = useState(exp.category);
  const [accent, setAccent] = useState(exp.accent);
  const [scenes, setScenes] = useState<Scene[]>(() => structuredClone(getScenes(exp)));
  const [sceneIdx, setSceneIdx] = useState(0);
  const [surfaceId, setSurfaceId] = useState('centre');
  const [selId, setSelId] = useState<string | null>(null);
  const [view, setView] = useState<'flat' | '3d'>('flat');
  const [aspect, setAspect] = useState(exp.aspectRatio ?? '16:9');
  const [audioTrack, setAudioTrack] = useState<string | undefined>(exp.audioTrack);
  const [panel, setPanel] = useState<PanelId | null>('scenes');
  const [bgPanel, setBgPanel] = useState(false);
  const [saved, setSaved] = useState(true);

  const scene = scenes[sceneIdx] ?? scenes[0];
  const selected = selId ? scene.surfaces[surfaceId]?.elements.find((e) => e.id === selId) : undefined;

  useEffect(() => {
    if (!roomSurfaces.some((s) => s.id === surfaceId)) {
      setSurfaceId(walls[0]?.id ?? roomSurfaces[0]?.id ?? 'centre');
      setSelId(null);
    }
  }, [roomSurfaces, surfaceId, walls]);

  const dirty = () => setSaved(false);
  const mutate = (fn: (s: Scene) => Scene) => { setScenes((l) => l.map((s, i) => (i === sceneIdx ? fn(structuredClone(s)) : s))); dirty(); };
  const mutateSurface = (sid: string, fn: (c: SurfaceContent) => SurfaceContent) =>
    mutate((s) => ({ ...s, surfaces: { ...s.surfaces, [sid]: fn(s.surfaces[sid] ?? { elements: [] }) } }));
  const patchElement = (elId: string, patch: Partial<SceneElement>) =>
    mutateSurface(surfaceId, (c) => ({ ...c, elements: c.elements.map((e) => (e.id === elId ? { ...e, ...patch } : e)) }));
  const addElement = (type: ElementType) => {
    const el = newElement(type);
    mutateSurface(surfaceId, (c) => ({ ...c, elements: [...c.elements, el] }));
    setSelId(el.id); setBgPanel(false);
  };
  const duplicateScene = (i: number) => {
    setScenes((l) => {
      const src = structuredClone(l[i]);
      src.id = `scene-${rid()}`; src.name = `${src.name} copy`;
      for (const sid of Object.keys(src.surfaces)) src.surfaces[sid].elements = src.surfaces[sid].elements.map((e) => ({ ...e, id: `${e.type}-${rid()}` }));
      const next = [...l]; next.splice(i + 1, 0, src); return next;
    });
    dirty();
  };

  const build = (): Experience => ({ ...exp, id: targetId, title, category, accent, builtIn: false, owner: exp.owner ?? operator, scenes, audioTrack, aspectRatio: aspect, wallOrder: walls.map((w) => w.id) });
  const save = () => { addExperience(build()); setSaved(true); };
  const deploy = () => { const e = build(); addExperience(e); loadExperience(e.id); goLive(true); setActiveScene(scenes[0].id); navigate(`/app/experience/${e.id}`); };

  const wallCount = walls.length || 1;
  const pickSurface = (sid: string) => { setSurfaceId(sid); setSelId(null); };

  return (
    <div className="flex h-screen flex-col">
      {/* top bar */}
      <header className="glass flex items-center justify-between gap-md border-b border-white/10 px-md py-sm">
        <div className="flex items-center gap-sm">
          <button onClick={() => navigate('/app/library')} className="text-on-surface-variant hover:text-primary"><Icon name="close" /></button>
          <div>
            <p className="text-label-sm text-on-surface-variant">Creator</p>
            <h2 className="text-label-md font-semibold">{title} <span className="text-on-surface-variant">› {scene.name}</span></h2>
          </div>
        </div>
        <div className="flex items-center gap-base">
          <select value={view} onChange={(e) => setView(e.target.value as 'flat' | '3d')} className="glass rounded-lg px-sm py-1.5 text-label-sm outline-none">
            <option value="flat">Flat View</option>
            <option value="3d">Virtual Room</option>
          </select>
          <select value={aspect} onChange={(e) => { setAspect(e.target.value); dirty(); }} className="glass rounded-lg px-sm py-1.5 text-label-sm outline-none" title="Aspect ratio">
            {ASPECTS.map((a) => <option key={a} value={a}>{a}{a === '32:9' ? ' wide' : ''}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-base">
          <button onClick={save} className="glass flex items-center gap-base rounded-lg px-md py-sm text-label-md hover:bg-white/10">
            <Icon name={saved ? 'check' : 'save'} size={18} /> {saved ? 'Saved' : 'Save'}
          </button>
          <PrimaryButton className="flex items-center gap-base py-sm" onClick={deploy}><Icon name="cast" size={18} /> Deploy</PrimaryButton>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* left icon rail */}
        <nav className="flex w-[76px] shrink-0 flex-col items-center gap-xs border-r border-white/10 bg-surface/60 py-md">
          {RAIL.map((r) => (
            <button
              key={r.id}
              onClick={() => setPanel((p) => (p === r.id ? null : r.id))}
              className={cn('flex w-full flex-col items-center gap-1 rounded-lg py-sm text-[10px] transition-colors', panel === r.id ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface')}
            >
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', panel === r.id && 'bg-primary/15')}><Icon name={r.icon} size={20} /></span>
              {r.label}
            </button>
          ))}
        </nav>

        {/* flyout panel */}
        {panel && (
          <aside className="w-64 shrink-0 overflow-y-auto border-r border-white/10 bg-surface-container-low/60 p-md custom-scrollbar">
            {panel === 'scenes' && (
              <Section title="Scenes" action={<button onClick={() => { setScenes((l) => [...l, newScene(`Scene ${l.length + 1}`, SCENES[0].id)]); dirty(); }} className="hover:text-primary"><Icon name="add" size={18} /></button>}>
                <div className="space-y-base">
                  {scenes.map((s, i) => (
                    <div key={s.id} className={cn('overflow-hidden rounded-lg border', i === sceneIdx ? 'border-primary' : 'border-white/10')}>
                      <button onClick={() => { setSceneIdx(i); setSelId(null); }} className="block aspect-video w-full">
                        <SurfaceView content={s.surfaces[walls[0]?.id ?? 'centre'] ?? { elements: [] }} editable className="pointer-events-none h-full w-full" />
                      </button>
                      <div className="flex items-center gap-1 px-1 py-0.5">
                        <span className="flex-1 truncate text-[11px]">{s.name}</span>
                        <button onClick={() => duplicateScene(i)} className="text-outline hover:text-primary"><Icon name="content_copy" size={13} /></button>
                        {scenes.length > 1 && <button onClick={() => { setScenes((l) => l.filter((_, j) => j !== i)); setSceneIdx(0); setSelId(null); dirty(); }} className="text-outline hover:text-error"><Icon name="close" size={13} /></button>}
                      </div>
                    </div>
                  ))}
                </div>
                <input value={scene.name} onChange={(e) => mutate((s) => ({ ...s, name: e.target.value }))} className="mt-sm w-full rounded bg-surface-container-low p-1 text-label-sm outline-none" placeholder="Scene name" />
              </Section>
            )}
            {panel === 'experience' && (
              <Section title="Experience Settings">
                <Labeled label="Title"><input value={title} onChange={(e) => { setTitle(e.target.value); dirty(); }} className={inputCls} /></Labeled>
                <Labeled label="Category">
                  <select value={category} onChange={(e) => { setCategory(e.target.value); dirty(); }} className={inputCls}>
                    {['Nature', 'Sci-Fi', 'Abstract', 'Generative', 'Calm', 'Sensory', 'Festival'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Labeled>
                <Labeled label="Background audio">
                  <div className="flex items-center gap-base">
                    <button onClick={() => readFile('audio/*', (url) => { setAudioTrack(url); dirty(); })} className="glass flex flex-1 items-center justify-center gap-base rounded-lg p-sm text-label-sm hover:bg-white/10">
                      <Icon name={audioTrack ? 'graphic_eq' : 'upload'} size={18} className="text-secondary" /> {audioTrack ? 'Replace' : 'Upload'}
                    </button>
                    {audioTrack && <button onClick={() => { setAudioTrack(undefined); dirty(); }} className="text-outline hover:text-error"><Icon name="close" size={16} /></button>}
                  </div>
                </Labeled>
              </Section>
            )}
            {panel === 'scene' && (
              <Section title="Scene Settings">
                <Labeled label="Auto-advance after (sec, 0 = off)">
                  <input type="number" min={0} value={scene.autoAdvanceSec ?? 0} onChange={(e) => { const v = Number(e.target.value); mutate((s) => ({ ...s, autoAdvanceSec: v > 0 ? v : undefined })); }} className={inputCls} />
                </Labeled>
                {scene.autoAdvanceSec ? (
                  <Labeled label="Then go to">
                    <select value={scene.nextSceneId ?? ''} onChange={(e) => mutate((s) => ({ ...s, nextSceneId: e.target.value || undefined }))} className={inputCls}>
                      <option value="">Next scene</option>
                      {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Labeled>
                ) : null}
                <button onClick={() => { setBgPanel(true); setSelId(null); }} className="mt-sm flex w-full items-center gap-base rounded-lg bg-primary/15 p-sm text-label-md text-primary"><Icon name="wallpaper" size={18} /> Edit background…</button>
              </Section>
            )}
            {panel === 'theme' && (
              <Section title="Theme">
                <Labeled label="Accent colour"><input type="color" value={accent} onChange={(e) => { setAccent(e.target.value); dirty(); }} className="h-9 w-full rounded bg-surface-container-low" /></Labeled>
                <p className="text-label-sm text-on-surface-variant">Sets the experience's accent used on cards and glows.</p>
              </Section>
            )}
            {panel === 'atoms' && (
              <Section title="Atoms"><ToolGrid tools={ATOM_TOOLS} onAdd={addElement} /></Section>
            )}
            {panel === 'items' && (
              <Section title="Scene Items"><ToolGrid tools={ITEM_TOOLS} onAdd={addElement} /></Section>
            )}
          </aside>
        )}

        {/* centre stage */}
        <div className="relative flex min-h-0 flex-1 flex-col bg-black">
          <div className="flex flex-1 items-center justify-center overflow-auto p-lg custom-scrollbar">
            {view === 'flat' ? (
              <div className="flex flex-col items-center gap-base">
                {/* continuous wall panorama */}
                <div className="flex" style={{ height: '46vh' }}>
                  {walls.map((s, i) => (
                    <WallTile key={s.id} label={s.label} active={surfaceId === s.id} aspect={aspect} onPick={() => pickSurface(s.id)}>
                      <SurfaceView content={wallContent(scene, s.id)} surface={s.id} bgOverride={panoramaStyle(scene, i, wallCount)} editable selectedId={surfaceId === s.id ? selId : null} onSelectElement={setSelId} onMoveElement={(eid, x, y) => patchElement(eid, { x, y })} className="h-full w-full" />
                    </WallTile>
                  ))}
                  {walls.length === 0 && <div className="flex items-center justify-center px-xl text-label-sm text-on-surface-variant">No walls in this room layout — enable surfaces in Room Setup.</div>}
                </div>
                {floor && (
                  <WallTile label={floor.label} active={surfaceId === floor.id} onPick={() => pickSurface(floor.id)} style={{ width: '60vh', height: '12vh' }}>
                    <SurfaceView content={scene.surfaces[floor.id] ?? { elements: [] }} surface={floor.id} editable selectedId={surfaceId === floor.id ? selId : null} onSelectElement={setSelId} onMoveElement={(eid, x, y) => patchElement(eid, { x, y })} className="h-full w-full" />
                  </WallTile>
                )}
              </div>
            ) : (
              <VirtualRoom scene={scene} walls={walls.map((w) => w.id)} wallCount={wallCount} hasFloor={!!floor} onPick={pickSurface} />
            )}
          </div>

          {/* bottom content dock */}
          <div className="flex items-center justify-center gap-sm border-t border-white/10 bg-surface/70 px-md py-sm">
            <DockButton icon="wallpaper" label="Background" active={bgPanel} onClick={() => { setBgPanel(true); setSelId(null); }} />
            <DockButton icon="animation" label="Sequences" onClick={() => { setPanel('scene'); setBgPanel(false); }} />
            <span className="mx-sm h-8 w-px bg-white/10" />
            {DOCK.map((d) => <DockButton key={d.type} icon={d.icon} label={d.label} onClick={() => addElement(d.type)} />)}
          </div>
        </div>

        {/* right properties */}
        {(selected || bgPanel) && (
          <aside className="w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-surface-container-low/60 p-md custom-scrollbar">
            <div className="mb-md flex items-center justify-between">
              <h3 className="text-label-md font-semibold text-primary">Properties</h3>
              <button onClick={() => { setSelId(null); setBgPanel(false); }} className="text-outline hover:text-on-surface"><Icon name="close" size={18} /></button>
            </div>
            {selected ? (
              <ElementInspector el={selected} scenes={scenes} onChange={(p) => patchElement(selected.id, p)} onDelete={() => { mutateSurface(surfaceId, (c) => ({ ...c, elements: c.elements.filter((e) => e.id !== selected.id) })); setSelId(null); }} />
            ) : (
              <BackgroundPanel scene={scene} surfaceId={surfaceId} surfaceLabel={roomSurfaces.find((s) => s.id === surfaceId)?.label ?? surfaceId} onScene={(p) => mutate((s) => ({ ...s, ...p }))} onSurface={(p) => mutateSurface(surfaceId, (c) => ({ ...c, ...p }))} />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-lg bg-surface-container-low p-sm text-label-md outline-none focus:ring-1 focus:ring-primary';

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between text-label-sm uppercase tracking-widest text-on-surface-variant">{title}{action}</div>
      {children}
    </div>
  );
}
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-label-sm text-on-surface-variant">{label}</span><div className="mt-xs">{children}</div></label>;
}
function ToolGrid({ tools, onAdd }: { tools: { type: ElementType; icon: string; label: string }[]; onAdd: (t: ElementType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-base">
      {tools.map((t) => (
        <button key={t.type} onClick={() => onAdd(t.type)} className="glass flex flex-col items-center gap-1 rounded-lg p-sm text-label-sm hover:bg-white/10">
          <Icon name={t.icon} size={20} className="text-primary" /> {t.label}
        </button>
      ))}
    </div>
  );
}
function DockButton({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('flex flex-col items-center gap-0.5 rounded-lg px-md py-1 text-[11px] transition-colors', active ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface')}>
      <Icon name={icon} size={20} /> {label}
    </button>
  );
}

function WallTile({ label, active, aspect, style, onPick, children }: { label: string; active: boolean; aspect?: string; style?: React.CSSProperties; onPick: () => void; children: React.ReactNode }) {
  return (
    <div className="relative h-full shrink-0" style={{ aspectRatio: aspect ? ratioCss(aspect) : undefined, ...style }} onPointerDown={onPick}>
      <button className={cn('absolute -top-7 left-1/2 z-10 -translate-x-1/2 rounded-md p-1', active ? 'bg-primary text-on-primary' : 'bg-white/10 text-on-surface-variant')} title={label}>
        <Icon name="zoom_out_map" size={16} />
      </button>
      <div className={cn('h-full w-full overflow-hidden border', active ? 'border-primary' : 'border-white/10')}>{children}</div>
    </div>
  );
}

function VirtualRoom({ scene, walls, wallCount, hasFloor, onPick }: { scene: Scene; walls: string[]; wallCount: number; hasFloor: boolean; onPick: (sid: string) => void }) {
  const wall = 'absolute h-[60%] w-[40%] origin-center overflow-hidden';
  const has = (id: string) => walls.includes(id);
  const idx = (id: string) => walls.indexOf(id);
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ perspective: '1200px' }}>
      <div className="relative h-[70%] w-[70%]" style={{ transformStyle: 'preserve-3d' }}>
        {has('left') && <div className={cn(wall, 'left-0 top-[20%]')} style={{ transform: 'rotateY(38deg) translateZ(-40px)' }} onPointerDown={() => onPick('left')}><SurfaceView content={wallContent(scene, 'left')} surface="left" bgOverride={panoramaStyle(scene, idx('left'), wallCount)} className="h-full w-full" /></div>}
        {has('centre') && <div className="absolute left-[30%] top-[20%] h-[60%] w-[40%] overflow-hidden" onPointerDown={() => onPick('centre')}><SurfaceView content={wallContent(scene, 'centre')} surface="centre" bgOverride={panoramaStyle(scene, idx('centre'), wallCount)} className="h-full w-full" /></div>}
        {has('right') && <div className={cn(wall, 'right-0 top-[20%]')} style={{ transform: 'rotateY(-38deg) translateZ(-40px)' }} onPointerDown={() => onPick('right')}><SurfaceView content={wallContent(scene, 'right')} surface="right" bgOverride={panoramaStyle(scene, idx('right'), wallCount)} className="h-full w-full" /></div>}
        {hasFloor && <div className="absolute bottom-0 left-[20%] h-[28%] w-[60%] overflow-hidden" style={{ transform: 'rotateX(58deg)' }} onPointerDown={() => onPick('floor')}><SurfaceView content={scene.surfaces.floor ?? { elements: [] }} surface="floor" className="h-full w-full" /></div>}
      </div>
    </div>
  );
}

function ElementInspector({ el, scenes, onChange, onDelete }: { el: SceneElement; scenes: Scene[]; onChange: (p: Partial<SceneElement>) => void; onDelete: () => void }) {
  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">{el.type} element</span>
        <button onClick={onDelete} className="text-outline hover:text-error"><Icon name="delete" size={18} /></button>
      </div>
      {el.type === 'text' && (
        <>
          <Labeled label="Text"><textarea value={el.text} onChange={(e) => onChange({ text: e.target.value })} rows={2} className={inputCls} /></Labeled>
          <Labeled label={`Size ${Math.round((el.fontSize ?? 0.12) * 100)}`}><Slider value={el.fontSize ?? 0.12} min={0.04} max={0.4} step={0.01} onChange={(v) => onChange({ fontSize: v })} /></Labeled>
        </>
      )}
      {(el.type === 'image' || el.type === 'video' || el.type === 'wipe') && (
        <Labeled label={el.type === 'wipe' ? 'Hidden image' : 'Source'}>
          <div className="flex gap-base">
            <input value={el.src ?? ''} onChange={(e) => onChange({ src: e.target.value })} placeholder="URL…" className={inputCls} />
            <button onClick={() => readFile(el.type === 'video' ? 'video/*' : 'image/*', (url) => onChange({ src: url }))} className="glass rounded-lg px-sm hover:bg-white/10"><Icon name="upload" size={18} /></button>
          </div>
        </Labeled>
      )}
      {el.type === 'web' && <Labeled label="Web address"><input value={el.src ?? ''} onChange={(e) => onChange({ src: e.target.value })} className={inputCls} /></Labeled>}
      {el.type === 'activity' && (
        <Labeled label="Activity"><select value={el.activityId ?? 'particles'} onChange={(e) => onChange({ activityId: e.target.value })} className={inputCls}>{ACTIVITIES.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.category}</option>)}</select></Labeled>
      )}
      {(el.type === 'timer' || el.type === 'progress') && <Labeled label="Duration (seconds)"><input type="number" min={1} value={el.duration ?? 30} onChange={(e) => onChange({ duration: Number(e.target.value) })} className={inputCls} /></Labeled>}
      {el.type === 'score' && <Labeled label="Label"><input value={el.label ?? ''} onChange={(e) => onChange({ label: e.target.value })} className={inputCls} /></Labeled>}
      {(el.type === 'hotspot' || el.type === 'lock') && (
        <>
          {el.type === 'hotspot' && <Labeled label="Label"><input value={el.label ?? ''} onChange={(e) => onChange({ label: e.target.value })} className={inputCls} /></Labeled>}
          {el.type === 'lock' && <>
            <Labeled label="Lock type"><select value={el.lockKind ?? 'numberpad'} onChange={(e) => onChange({ lockKind: e.target.value as SceneElement['lockKind'] })} className={inputCls}><option value="numberpad">Numberpad</option><option value="sliding">Sliding</option><option value="descramble">Descramble</option></select></Labeled>
            <Labeled label="Unlock code"><input value={el.code ?? ''} onChange={(e) => onChange({ code: e.target.value })} className={inputCls} /></Labeled>
          </>}
          <Labeled label={el.type === 'lock' ? 'On unlock → scene' : 'On tap → scene'}>
            <select value={el.targetSceneId ?? ''} onChange={(e) => onChange({ targetSceneId: e.target.value || undefined })} className={inputCls}>
              <option value="">(nothing)</option>
              {scenes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Labeled>
        </>
      )}
      {el.type !== 'web' && el.type !== 'image' && el.type !== 'video' && (
        <Labeled label="Colour"><input type="color" value={el.color ?? '#adc6ff'} onChange={(e) => onChange({ color: e.target.value })} className="h-9 w-full rounded bg-surface-container-low" /></Labeled>
      )}
      <div className="grid grid-cols-2 gap-base border-t border-white/5 pt-md">
        <Labeled label={`Width ${Math.round(el.w * 100)}%`}><Slider value={el.w} min={0.05} max={1} step={0.01} onChange={(v) => onChange({ w: v })} /></Labeled>
        <Labeled label={`Height ${Math.round(el.h * 100)}%`}><Slider value={el.h} min={0.05} max={1} step={0.01} onChange={(v) => onChange({ h: v })} /></Labeled>
      </div>
    </div>
  );
}

function BackgroundPanel({ scene, surfaceId, surfaceLabel, onScene, onSurface }: { scene: Scene; surfaceId: string; surfaceLabel: string; onScene: (p: Partial<Scene>) => void; onSurface: (p: Partial<SurfaceContent>) => void }) {
  const type = scene.backgroundType ?? 'per-surface';
  const content = scene.surfaces[surfaceId] ?? { elements: [] };
  const isVid = !!scene.panoramaSrc && /\.(mp4|mov|webm|ogg)(\?|$)/i.test(scene.panoramaSrc);
  return (
    <div className="space-y-md">
      <Labeled label="Background Type">
        <select value={type} onChange={(e) => onScene({ backgroundType: e.target.value as BackgroundType })} className={inputCls}>
          {BG_TYPES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
      </Labeled>

      {type === 'per-surface' && (
        <div className="space-y-md rounded-lg bg-surface-container/40 p-sm">
          <p className="text-label-sm text-on-surface-variant">Editing <span className="text-primary">{surfaceLabel}</span></p>
          <Labeled label="Generative scene">
            <select value={content.backgroundSrc ? '' : content.backgroundSceneId ?? ''} onChange={(e) => onSurface({ backgroundSceneId: e.target.value || undefined, backgroundSrc: undefined })} className={inputCls}>
              <option value="">(none)</option>
              {SCENES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Labeled>
          <Labeled label="…or image / video">
            <div className="flex gap-base">
              <input value={content.backgroundSrc ?? ''} onChange={(e) => onSurface({ backgroundSrc: e.target.value || undefined, backgroundSceneId: undefined })} placeholder="URL…" className={inputCls} />
              <button onClick={() => readFile('image/*,video/*', (url) => onSurface({ backgroundSrc: url, backgroundSceneId: undefined }))} className="glass rounded-lg px-sm hover:bg-white/10"><Icon name="upload" size={18} /></button>
            </div>
          </Labeled>
          {content.backgroundSrc && /\.(mp4|mov|webm|ogg)(\?|$)/i.test(content.backgroundSrc) && (
            <label className="flex items-center gap-sm text-label-md"><input type="checkbox" checked={content.backgroundMuted ?? true} onChange={(e) => onSurface({ backgroundMuted: e.target.checked })} className="h-4 w-4 accent-primary" /> Mute video</label>
          )}
        </div>
      )}

      {type === 'colour' && (
        <Labeled label="Colour"><input type="color" value={scene.panoramaColor ?? '#000000'} onChange={(e) => onScene({ panoramaColor: e.target.value })} className="h-10 w-full rounded bg-surface-container-low" /></Labeled>
      )}

      {type === 'use-previous' && <p className="text-label-sm text-on-surface-variant">This scene inherits the previous scene's background.</p>}

      {type !== 'per-surface' && type !== 'colour' && type !== 'use-previous' && (
        <div className="space-y-md rounded-lg bg-surface-container/40 p-sm">
          <p className="text-label-sm text-on-surface-variant">A single {isVid ? 'video' : 'image'} is mapped across all walls ({BG_TYPES.find((b) => b.id === type)?.label}).</p>
          <Labeled label="Panorama media">
            <div className="flex gap-base">
              <input value={scene.panoramaSrc ?? ''} onChange={(e) => onScene({ panoramaSrc: e.target.value || undefined })} placeholder="URL…" className={inputCls} />
              <button onClick={() => readFile('image/*,video/*', (url) => onScene({ panoramaSrc: url }))} className="glass rounded-lg px-sm hover:bg-white/10"><Icon name="upload" size={18} /></button>
            </div>
          </Labeled>
          {scene.panoramaSrc && <div className="aspect-[32/9] overflow-hidden rounded border border-white/10">{isVid ? <video src={scene.panoramaSrc} muted loop autoPlay className="h-full w-full object-cover" /> : <img src={scene.panoramaSrc} alt="" className="h-full w-full object-cover" />}</div>}
        </div>
      )}
    </div>
  );
}
