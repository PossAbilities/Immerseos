import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { Stage } from '@/components/Stage';
import { QRCode, useRemoteUrl } from '@/components/QRCode';
import { GlassPanel, IconButton, SectionLabel, Slider, StatusPill } from '@/components/ui';
import { SceneParamSliders } from '@/components/SceneParamSliders';
import { useStore, currentExperience } from '@/store/useStore';
import { cn, formatTime } from '@/lib/cn';
import { LIGHTING_PRESETS } from '@/lib/presets';

const HARDWARE = [
  { name: 'Projector A-01', status: 'Online', tone: 'ok' },
  { name: 'Projector A-02', status: 'Online', tone: 'ok' },
  { name: 'Projector A-03', status: 'Online', tone: 'ok' },
  { name: 'Spatial Audio Hub', status: 'Syncing', tone: 'sync' },
];

export function TheaterControl() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exp = useStore(currentExperience);
  const live = useStore((s) => s.live);
  const playing = useStore((s) => s.playing);
  const position = useStore((s) => s.positionSec);
  const volume = useStore((s) => s.volume);
  const lighting = useStore((s) => s.lighting);
  const lightIntensity = useStore((s) => s.lightIntensity);
  const params = useStore((s) => s.params);
  const remotes = useStore((s) => s.remotesConnected);

  const experiences = useStore((s) => s.experiences);
  const loadExperience = useStore((s) => s.loadExperience);
  const togglePlay = useStore((s) => s.togglePlay);
  const goLive = useStore((s) => s.goLive);
  const patch = useStore((s) => s.patch);
  const setParam = useStore((s) => s.setParam);

  const remoteUrl = useRemoteUrl();

  // ensure the routed experience is the active one; if the id is unknown
  // (e.g. a user experience created on another machine), return to the library
  // rather than silently showing an unrelated scene.
  useEffect(() => {
    if (!id) return;
    if (!experiences.some((e) => e.id === id)) {
      navigate('/app/library', { replace: true });
    } else if (id !== exp.id) {
      loadExperience(id);
    }
  }, [id, exp.id, experiences, loadExperience, navigate]);

  const progress = Math.min(100, (position / exp.durationSec) * 100);

  return (
    <div className="p-margin">
      {/* header */}
      <header className="mb-lg flex items-center justify-between">
        <div>
          <nav className="mb-xs flex items-center gap-xs text-label-sm text-on-surface-variant">
            <Link to="/app/library" className="hover:text-primary">Library</Link>
            <Icon name="chevron_right" size={14} />
            <span className="text-primary">{exp.title}</span>
          </nav>
          <h2 className="text-headline-lg">{exp.title}</h2>
        </div>
        <div className="flex items-center gap-md">
          <StatusPill
            label={live ? 'Projection Active' : 'Stage Idle'}
            tone={live ? 'live' : 'idle'}
          />
          <IconButton name="share" />
          <IconButton name="favorite" />
        </div>
      </header>

      <div className="grid grid-cols-12 gap-gutter">
        {/* main column */}
        <div className="col-span-12 space-y-gutter lg:col-span-8">
          {/* preview */}
          <GlassPanel edge className="group relative aspect-video overflow-hidden border-primary/20 p-0 shadow-2xl">
            <Stage sceneId={exp.sceneId} params={params} playing={playing} className="h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface/70 via-transparent to-transparent" />
            <div className="absolute bottom-md left-md right-md flex items-end justify-between">
              <div className="flex items-center gap-base">
                <button
                  onClick={() => {
                    if (!live) goLive(true);
                    else togglePlay();
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary-container shadow-xl transition-all active:scale-95"
                >
                  <Icon name={playing ? 'pause' : 'play_arrow'} filled />
                </button>
                <div className="glass rounded-lg px-md py-xs">
                  <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                    Renderer
                  </p>
                  <p className="text-label-md text-white">4K Ultra · 60fps</p>
                </div>
              </div>
              <IconButton name="aspect_ratio" />
            </div>
            {!live && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <button
                  onClick={() => goLive(true)}
                  className="btn-bloom flex items-center gap-base rounded-full bg-primary px-lg py-md text-label-md font-semibold text-on-primary"
                >
                  <Icon name="cast" /> Go Live to Room
                </button>
              </div>
            )}
          </GlassPanel>

          {/* transport */}
          <GlassPanel className="flex items-center gap-lg p-md">
            <div className="flex-1">
              <div className="mb-xs flex items-center justify-between">
                <span className="text-label-sm text-on-surface-variant">Timeline Position</span>
                <span className="text-label-md text-primary">
                  {formatTime(position)} / {formatTime(exp.durationSec)}
                </span>
              </div>
              <div
                className="group relative h-1.5 cursor-pointer overflow-hidden rounded-full bg-white/10"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  patch({ positionSec: ratio * exp.durationSec });
                }}
              >
                <div
                  className="absolute left-0 top-0 h-full bg-tertiary-container"
                  style={{ width: `${progress}%` }}
                />
                <div
                  className="absolute top-0 h-full w-1 bg-primary shadow-[0_0_10px_#adc6ff]"
                  style={{ left: `${progress}%` }}
                />
              </div>
            </div>
            <div className="flex w-[220px] items-center gap-sm">
              <Icon name="volume_up" className="text-on-surface-variant" />
              <Slider value={volume} onChange={(v) => patch({ volume: v })} />
              <span className="w-9 text-right text-label-sm">{volume}%</span>
            </div>
          </GlassPanel>

          {/* live scene tuning */}
          <GlassPanel className="p-md">
            <SectionLabel>Live Scene Tuning</SectionLabel>
            <div className="mt-md">
              <SceneParamSliders params={params} onChange={setParam} />
            </div>
          </GlassPanel>
        </div>

        {/* side column */}
        <div className="col-span-12 space-y-gutter lg:col-span-4">
          {/* remote sync */}
          <GlassPanel edge className="space-y-md border-t border-primary/30 p-md text-center">
            <div className="flex items-center justify-between">
              <SectionLabel>
                <span className="text-primary">Remote Sync</span>
              </SectionLabel>
              <Icon name="sensors" className="text-primary" />
            </div>
            <div className="relative mx-auto h-44 w-44 rounded-lg bg-white p-base shadow-inner">
              <QRCode value={remoteUrl} size={160} />
            </div>
            <div className="space-y-base">
              <p className="text-body-md">Scan to control the room</p>
              <p className="text-label-sm leading-relaxed text-on-surface-variant">
                Turn any phone into a tactile remote — playback, scenes and
                lighting in your pocket. No app install.
              </p>
              <div className="flex items-center justify-center gap-xs text-label-sm text-on-surface-variant">
                <span className={cn('h-2 w-2 rounded-full', remotes > 0 ? 'bg-secondary' : 'bg-outline')} />
                {remotes > 0 ? `${remotes} remote${remotes > 1 ? 's' : ''} connected` : 'No remotes connected'}
              </div>
            </div>
          </GlassPanel>

          {/* lighting */}
          <GlassPanel className="space-y-md p-md">
            <SectionLabel>Environment Lighting</SectionLabel>
            <div className="grid grid-cols-2 gap-base">
              {LIGHTING_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => patch({ lighting: p.id })}
                  className={cn(
                    'bloom glass rounded-lg p-md text-left transition-all',
                    lighting === p.id && 'is-active',
                  )}
                >
                  <Icon
                    name={p.icon}
                    className={cn('mb-sm', lighting === p.id ? 'text-primary' : 'text-on-surface-variant')}
                  />
                  <p className="text-label-md">{p.title}</p>
                  <p className="text-[10px] text-on-surface-variant">{p.sub}</p>
                </button>
              ))}
            </div>
            <div className="space-y-base pt-sm">
              <div className="flex items-center justify-between">
                <span className="text-label-sm">Intensity</span>
                <span className="text-label-md">{lightIntensity}%</span>
              </div>
              <Slider value={lightIntensity} onChange={(v) => patch({ lightIntensity: v })} />
            </div>
          </GlassPanel>

          {/* hardware */}
          <GlassPanel className="p-md">
            <div className="mb-md flex items-center gap-sm">
              <Icon name="router" className="text-on-surface-variant" />
              <SectionLabel>Stage Hardware</SectionLabel>
            </div>
            <ul className="space-y-sm">
              {HARDWARE.map((h) => (
                <li key={h.name} className="flex items-center justify-between">
                  <span className="text-label-sm text-on-surface-variant">{h.name}</span>
                  <span
                    className={cn(
                      'flex items-center gap-1 text-label-sm',
                      h.tone === 'ok' ? 'text-green-400' : 'text-primary',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        h.tone === 'ok' ? 'bg-green-400' : 'animate-pulse bg-primary',
                      )}
                    />
                    {h.status}
                  </span>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </div>
      </div>

      {/* floating tools */}
      <div className="fixed bottom-margin right-margin flex flex-col gap-base">
        <button
          onClick={() => navigate('/app/creator/' + exp.id)}
          className="glass flex h-12 w-12 items-center justify-center rounded-xl shadow-2xl transition-all hover:bg-primary hover:text-on-primary-container"
          title="Open in Creator"
        >
          <Icon name="edit" />
        </button>
        <button
          className="glass flex h-12 w-12 items-center justify-center rounded-xl shadow-2xl transition-all hover:bg-error hover:text-on-error"
          title="System Diagnostics"
        >
          <Icon name="monitoring" />
        </button>
      </div>
    </div>
  );
}
