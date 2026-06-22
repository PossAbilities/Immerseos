import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { SurfaceView } from '@/components/SurfaceView';
import { GlassPanel, PrimaryButton, SectionLabel, Slider } from '@/components/ui';
import { useStore, currentExperience } from '@/store/useStore';
import { EDITOR_SURFACES, getScenes, newElement, newScene } from '@/lib/sceneModel';
import { SCENES } from '@/engine/scenes';
import { cn } from '@/lib/cn';
import type { ElementType, Experience, Scene, SceneElement, SurfaceContent } from '@/lib/types';

const TOOLS: { type: ElementType; icon: string; label: string }[] = [
  { type: 'image', icon: 'image', label: 'Image' },
  { type: 'text', icon: 'title', label: 'Text' },
  { type: 'hotspot', icon: 'touch_app', label: 'Hotspot' },
  { type: 'video', icon: 'movie', label: 'Video' },
  { type: 'web', icon: 'public', label: 'Web View' },
];

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

  const exp = useMemo(() => experiences.find((e) => e.id === id) ?? fromStore, [experiences, id, fromStore]);

  const [scenes, setScenes] = useState<Scene[]>(() => structuredClone(getScenes(exp)));
  const [sceneIdx, setSceneIdx] = useState(0);
  const [surfaceId, setSurfaceId] = useState('centre');
  const [selId, setSelId] = useState<string | null>(null);
  const [view, setView] = useState<'flat' | '3d'>('flat');
  const [saved, setSaved] = useState(true);

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

  const build = (): Experience => ({ ...exp, scenes, thumbnail: exp.thumbnail });
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
            <div className="space-y-1">
              {scenes.map((s, i) => (
                <div key={s.id} className={cn('flex items-center gap-1 rounded-lg p-sm', i === sceneIdx ? 'bg-white/10' : 'hover:bg-white/5')}>
                  <button onClick={() => { setSceneIdx(i); setSelId(null); }} className="flex-1 truncate text-left text-label-md">{s.name}</button>
                  {scenes.length > 1 && (
                    <button onClick={() => { setScenes((l) => l.filter((_, j) => j !== i)); setSceneIdx(0); setSaved(false); }} className="text-outline hover:text-error"><Icon name="close" size={14} /></button>
                  )}
                </div>
              ))}
            </div>
            <input
              value={scene.name}
              onChange={(e) => mutate((s) => ({ ...s, name: e.target.value }))}
              className="mt-sm w-full rounded bg-surface-container-low p-1 text-label-sm outline-none"
            />
          </div>

          <div>
            <SectionLabel>Add to “{EDITOR_SURFACES.find((s) => s.id === surfaceId)?.label}”</SectionLabel>
            <div className="mt-sm grid grid-cols-2 gap-base">
              {TOOLS.map((t) => (
                <button key={t.type} onClick={() => addElement(t.type)} className="glass flex flex-col items-center gap-1 rounded-lg p-sm text-label-sm hover:bg-white/10">
                  <Icon name={t.icon} size={20} className="text-primary" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </GlassPanel>

        {/* centre: surfaces */}
        <div className="col-span-7 overflow-auto rounded-xl bg-black/40 p-md custom-scrollbar">
          {view === 'flat' ? (
            <div className="flex h-full flex-col gap-sm">
              <div className="grid flex-1 grid-cols-3 gap-sm">
                {EDITOR_SURFACES.slice(0, 3).map((s) => (
                  <SurfacePane key={s.id} label={s.label} active={surfaceId === s.id} onPick={() => { setSurfaceId(s.id); setSelId(null); }}>
                    <SurfaceView content={scene.surfaces[s.id] ?? { elements: [] }} editable selectedId={surfaceId === s.id ? selId : null} onSelectElement={setSelId} onMoveElement={(eid, x, y) => patchElement(eid, { x, y })} className="h-full w-full" />
                  </SurfacePane>
                ))}
              </div>
              <SurfacePane label="Floor" active={surfaceId === 'floor'} onPick={() => { setSurfaceId('floor'); setSelId(null); }} className="h-32">
                <SurfaceView content={scene.surfaces.floor ?? { elements: [] }} editable selectedId={surfaceId === 'floor' ? selId : null} onSelectElement={setSelId} onMoveElement={(eid, x, y) => patchElement(eid, { x, y })} className="h-full w-full" />
              </SurfacePane>
            </div>
          ) : (
            <VirtualRoom scene={scene} onPick={(sid) => { setSurfaceId(sid); setSelId(null); }} />
          )}
        </div>

        {/* right: inspector */}
        <GlassPanel className="col-span-3 overflow-y-auto p-md custom-scrollbar">
          {selected ? (
            <ElementInspector el={selected} scenes={scenes} onChange={(p) => patchElement(selected.id, p)} onDelete={() => { mutateSurface(surfaceId, (c) => ({ ...c, elements: c.elements.filter((e) => e.id !== selected.id) })); setSelId(null); }} />
          ) : (
            <BackgroundInspector content={scene.surfaces[surfaceId] ?? { elements: [] }} label={EDITOR_SURFACES.find((s) => s.id === surfaceId)?.label ?? surfaceId} onChange={(p) => mutateSurface(surfaceId, (c) => ({ ...c, ...p }))} />
          )}
        </GlassPanel>
      </div>
    </div>
  );
}

function SurfacePane({ label, active, onPick, className, children }: { label: string; active: boolean; onPick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-lg border', active ? 'border-primary' : 'border-white/10', className)} onPointerDown={onPick}>
      <div className="flex items-center justify-between bg-surface-container-high/60 px-sm py-1 text-[11px] uppercase tracking-widest text-on-surface-variant">
        {label}
        {active && <Icon name="edit" size={12} className="text-primary" />}
      </div>
      <div className="relative flex-1">{children}</div>
    </div>
  );
}

/** A CSS-3D approximation of the room for the "Virtual Room" preview. */
function VirtualRoom({ scene, onPick }: { scene: Scene; onPick: (sid: string) => void }) {
  const wall = 'absolute h-[60%] w-[40%] origin-center overflow-hidden';
  return (
    <div className="flex h-full items-center justify-center" style={{ perspective: '1200px' }}>
      <div className="relative h-[70%] w-[70%]" style={{ transformStyle: 'preserve-3d' }}>
        <div className={cn(wall, 'left-0 top-[20%]')} style={{ transform: 'rotateY(38deg) translateZ(-40px)' }} onPointerDown={() => onPick('left')}>
          <SurfaceView content={scene.surfaces.left ?? { elements: [] }} className="h-full w-full" />
        </div>
        <div className="absolute left-[30%] top-[20%] h-[60%] w-[40%] overflow-hidden" onPointerDown={() => onPick('centre')}>
          <SurfaceView content={scene.surfaces.centre ?? { elements: [] }} className="h-full w-full" />
        </div>
        <div className={cn(wall, 'right-0 top-[20%]')} style={{ transform: 'rotateY(-38deg) translateZ(-40px)' }} onPointerDown={() => onPick('right')}>
          <SurfaceView content={scene.surfaces.right ?? { elements: [] }} className="h-full w-full" />
        </div>
        <div className="absolute bottom-0 left-[20%] h-[28%] w-[60%] overflow-hidden" style={{ transform: 'rotateX(58deg)' }} onPointerDown={() => onPick('floor')}>
          <SurfaceView content={scene.surfaces.floor ?? { elements: [] }} className="h-full w-full" />
        </div>
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
      {(content.backgroundSrc || content.backgroundSceneId) && (
        <button onClick={() => onChange({ backgroundSrc: undefined, backgroundSceneId: undefined })} className="text-label-sm text-error hover:underline">Clear background</button>
      )}
    </div>
  );
}
