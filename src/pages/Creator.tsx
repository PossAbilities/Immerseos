import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Stage } from '@/components/Stage';
import { GlassPanel, PrimaryButton, SectionLabel, Slider } from '@/components/ui';
import { SceneParamSliders } from '@/components/SceneParamSliders';
import { SCENES, getScene } from '@/engine/scenes';
import { useStore } from '@/store/useStore';
import { cn, formatTime } from '@/lib/cn';
import type { Experience, Layer, SceneParams } from '@/lib/types';

const MEDIA_ASSETS: { name: string; meta: string; icon: string; kind: 'video' | 'audio' }[] = [
  { name: 'Nebula_Core_01.mp4', meta: '4K · 240fps', icon: 'movie', kind: 'video' },
  { name: 'Fluid_Dynamics_B.mov', meta: '4K · 60fps', icon: 'movie', kind: 'video' },
  { name: 'Ambience_Loop_Sub.wav', meta: 'Audio · 8:00', icon: 'graphic_eq', kind: 'audio' },
  { name: 'Forest_Birdsong.wav', meta: 'Audio · 12:00', icon: 'graphic_eq', kind: 'audio' },
];

const TRIGGERS = [
  { name: 'Snow Burst', icon: 'ac_unit' },
  { name: 'Light Flash', icon: 'flash_on' },
  { name: 'Audio Cue', icon: 'campaign' },
];

const LAYER_ICON: Record<Layer['type'], string> = {
  scene: 'auto_awesome',
  video: 'movie',
  audio: 'graphic_eq',
  trigger: 'bolt',
};

const LAYER_COLOR: Record<Layer['type'], string> = {
  scene: 'bg-primary-container/70',
  video: 'bg-primary-container/40',
  audio: 'bg-secondary-container/30',
  trigger: 'bg-tertiary-container/60',
};

let layerSeq = 0;
const uid = () => `layer-${Date.now()}-${layerSeq++}`;

export function Creator() {
  const { id } = useParams();
  const navigate = useNavigate();
  const experiences = useStore((s) => s.experiences);
  const addExperience = useStore((s) => s.addExperience);
  const loadExperience = useStore((s) => s.loadExperience);
  const goLive = useStore((s) => s.goLive);

  const editing = id ? experiences.find((e) => e.id === id) : undefined;

  const [title, setTitle] = useState(editing?.title ?? 'Untitled Experience');
  const [category, setCategory] = useState(editing?.category ?? 'Generative');
  const [sceneId, setSceneId] = useState(editing?.sceneId ?? SCENES[0].id);
  const [params, setParams] = useState<SceneParams>(
    editing ? { ...editing.params } : { ...getScene(SCENES[0].id).defaults },
  );
  const [duration, setDuration] = useState(editing?.durationSec ?? 480);
  const [layers, setLayers] = useState<Layer[]>(
    editing?.layers.filter((l) => l.type !== 'scene') ?? [],
  );
  const [saved, setSaved] = useState(false);

  const scene = getScene(sceneId);

  const allLayers = useMemo<Layer[]>(
    () => [
      { id: 'base', type: 'scene', refId: sceneId, label: scene.name, start: 0, duration },
      ...layers,
    ],
    [sceneId, scene.name, duration, layers],
  );

  const chooseScene = (sid: string) => {
    setSceneId(sid);
    setParams({ ...getScene(sid).defaults });
    setSaved(false);
  };

  const addLayer = (type: Layer['type'], refId: string, label: string) => {
    setLayers((ls) => [
      ...ls,
      { id: uid(), type, refId, label, start: 0, duration: Math.min(120, duration) },
    ]);
    setSaved(false);
  };

  const removeLayer = (lid: string) => setLayers((ls) => ls.filter((l) => l.id !== lid));

  const build = (): Experience => ({
    // preserve any metadata set elsewhere (collection, thumbnail, sharing…)
    ...(editing ?? {}),
    id: editing?.id ?? `user-${Date.now()}`,
    title,
    category,
    sceneId,
    tagline: editing?.tagline ?? `${category} · custom build`,
    description:
      editing?.description ??
      `A custom immersive experience authored in the ImmerseOS Creator on ${new Date().toLocaleDateString()}.`,
    accent: scene.accent,
    durationSec: duration,
    builtIn: false,
    createdAt: editing?.createdAt ?? Date.now(),
    params,
    layers: allLayers,
    audioTrack: layers.find((l) => l.type === 'audio')?.refId,
  });

  const save = () => {
    addExperience(build());
    setSaved(true);
  };

  const deploy = () => {
    const exp = build();
    addExperience(exp);
    loadExperience(exp.id);
    goLive(true);
    navigate(`/app/experience/${exp.id}`);
  };

  return (
    <div className="flex h-screen flex-col p-margin">
      {/* top bar */}
      <header className="mb-md flex items-center justify-between">
        <div className="flex items-center gap-md">
          <h2 className="text-headline-md">Creator Tool</h2>
          <span className="flex items-center gap-xs rounded-full bg-secondary-container/10 px-sm py-xs text-label-sm text-secondary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" /> Rendering live stage
          </span>
        </div>
        <div className="flex items-center gap-base">
          <button
            onClick={save}
            className="glass flex items-center gap-base rounded-lg px-md py-sm text-label-md transition-colors hover:bg-white/10"
          >
            <Icon name={saved ? 'check' : 'save'} size={20} />
            {saved ? 'Saved' : 'Save Draft'}
          </button>
          <PrimaryButton className="flex items-center gap-base py-sm" onClick={deploy}>
            <Icon name="cast" size={20} /> Deploy Content
          </PrimaryButton>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-gutter">
        {/* asset library */}
        <GlassPanel className="col-span-3 flex flex-col overflow-hidden p-md">
          <SectionLabel>Scene Engine</SectionLabel>
          <div className="custom-scrollbar mt-sm grid grid-cols-2 gap-base overflow-y-auto pr-1">
            {SCENES.map((s) => (
              <button
                key={s.id}
                onClick={() => chooseScene(s.id)}
                className={cn(
                  'group overflow-hidden rounded-lg border text-left transition-all',
                  sceneId === s.id ? 'border-primary' : 'border-white/10 hover:border-white/30',
                )}
              >
                <div className="relative aspect-video">
                  <Stage sceneId={s.id} params={s.defaults} className="h-full w-full" />
                  {sceneId === s.id && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary">
                      <Icon name="check" size={14} />
                    </span>
                  )}
                </div>
                <p className="truncate px-xs py-1 text-[11px]">{s.name}</p>
              </button>
            ))}
          </div>

          <SectionLabel>Media Assets</SectionLabel>
          <div className="mt-sm space-y-base">
            {MEDIA_ASSETS.map((a) => (
              <button
                key={a.name}
                onClick={() => addLayer(a.kind, a.name, a.name)}
                className="glass flex w-full items-center gap-sm rounded-lg p-sm text-left transition-colors hover:bg-white/10"
              >
                <Icon name={a.icon} className="text-primary" size={20} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label-sm">{a.name}</p>
                  <p className="text-[10px] text-on-surface-variant">{a.meta}</p>
                </div>
                <Icon name="add" size={18} className="text-outline" />
              </button>
            ))}
          </div>

          <SectionLabel>Triggers</SectionLabel>
          <div className="mt-sm flex flex-wrap gap-base">
            {TRIGGERS.map((t) => (
              <button
                key={t.name}
                onClick={() => addLayer('trigger', t.name, t.name)}
                className="glass flex items-center gap-xs rounded-full px-sm py-xs text-label-sm transition-colors hover:bg-white/10"
              >
                <Icon name={t.icon} size={16} className="text-tertiary" /> {t.name}
              </button>
            ))}
          </div>
        </GlassPanel>

        {/* stage + timeline */}
        <div className="col-span-6 flex min-h-0 flex-col gap-gutter">
          <GlassPanel edge className="relative flex-1 overflow-hidden p-0">
            <Stage sceneId={sceneId} params={params} className="h-full w-full" />
            <div className="absolute left-md top-md flex items-center gap-xs text-label-sm text-secondary">
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" /> LIVE STAGE PREVIEW
            </div>
            <div className="pointer-events-none absolute inset-md rounded-lg border border-primary/20" />
          </GlassPanel>

          {/* timeline */}
          <GlassPanel className="p-md">
            <div className="mb-sm flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <Icon name="skip_previous" className="text-on-surface-variant" />
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary">
                  <Icon name="play_arrow" filled size={20} />
                </span>
                <Icon name="skip_next" className="text-on-surface-variant" />
                <span className="ml-sm font-mono text-label-md text-primary">
                  {formatTime(duration)}
                </span>
              </div>
              <SectionLabel>Master Sequence</SectionLabel>
            </div>
            <div className="space-y-base">
              {allLayers.map((l) => (
                <div key={l.id} className="flex items-center gap-sm">
                  <span className="w-6 shrink-0 text-center text-on-surface-variant">
                    <Icon name={LAYER_ICON[l.type]} size={18} />
                  </span>
                  <div className="relative h-8 flex-1 overflow-hidden rounded bg-surface-container-low">
                    <div
                      className={cn(
                        'absolute top-0 flex h-full items-center gap-xs rounded px-sm text-[11px] text-white',
                        LAYER_COLOR[l.type],
                      )}
                      style={{
                        left: `${(l.start / duration) * 100}%`,
                        width: `${Math.min(100, (l.duration / duration) * 100)}%`,
                      }}
                    >
                      <span className="truncate">{l.label}</span>
                    </div>
                  </div>
                  {l.id !== 'base' && (
                    <button
                      onClick={() => removeLayer(l.id)}
                      className="text-outline transition-colors hover:text-error"
                      title={`Remove ${l.label}`}
                    >
                      <Icon name="close" size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        {/* inspector */}
        <GlassPanel className="col-span-3 flex flex-col gap-md overflow-y-auto p-md">
          <div>
            <SectionLabel>Experience Name</SectionLabel>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSaved(false);
              }}
              className="mt-sm w-full rounded-lg bg-surface-container-low p-sm text-body-md outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <SectionLabel>Category</SectionLabel>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-sm w-full rounded-lg bg-surface-container-low p-sm text-body-md outline-none focus:ring-1 focus:ring-primary"
            >
              {['Nature', 'Sci-Fi', 'Abstract', 'Generative', 'Calm'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <SectionLabel>Duration</SectionLabel>
            <div className="mt-sm flex items-center justify-between text-label-md">
              <span className="text-on-surface-variant">Loop length</span>
              <span>{formatTime(duration)}</span>
            </div>
            <Slider value={duration} min={60} max={1800} step={30} onChange={(v) => setDuration(v)} />
          </div>

          <div className="border-t border-white/5 pt-md">
            <SectionLabel>Scene Parameters</SectionLabel>
            <div className="mt-sm">
              <SceneParamSliders
                params={params}
                columns={1}
                onChange={(key, v) => {
                  setParams((p) => ({ ...p, [key]: v }));
                  setSaved(false);
                }}
              />
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
