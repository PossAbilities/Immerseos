import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Slider } from '@/components/ui';
import { SCENES } from '@/engine/scenes';
import { useStore, currentExperience } from '@/store/useStore';
import { cn } from '@/lib/cn';
import type { LightingPreset } from '@/lib/types';

const LIGHTS: { id: LightingPreset; icon: string; label: string }[] = [
  { id: 'ambient', icon: 'lightbulb', label: 'Ambient' },
  { id: 'blackout', icon: 'dark_mode', label: 'Black' },
  { id: 'daylight', icon: 'wb_sunny', label: 'Daylight' },
  { id: 'accent', icon: 'palette', label: 'Accent' },
];

function haptic() {
  if ('vibrate' in navigator) navigator.vibrate(8);
}

export function Remote() {
  const exp = useStore(currentExperience);
  const live = useStore((s) => s.live);
  const playing = useStore((s) => s.playing);
  const volume = useStore((s) => s.volume);
  const lighting = useStore((s) => s.lighting);
  const lightIntensity = useStore((s) => s.lightIntensity);
  const params = useStore((s) => s.params);

  const patch = useStore((s) => s.patch);
  const togglePlay = useStore((s) => s.togglePlay);
  const goLive = useStore((s) => s.goLive);
  const loadExperience = useStore((s) => s.loadExperience);
  const setParam = useStore((s) => s.setParam);

  // simple "connected" heartbeat: we mark connected once we receive any state
  const [connected, setConnected] = useState(false);
  const updatedAt = useStore((s) => s.updatedAt);
  useEffect(() => {
    const t = setTimeout(() => setConnected(true), 600);
    return () => clearTimeout(t);
  }, [updatedAt]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-md p-md pb-xl">
      {/* header */}
      <header className="flex items-center justify-between pt-sm">
        <div>
          <h1 className="text-headline-md font-semibold tracking-tight text-primary">
            ImmerseOS
          </h1>
          <p className="text-label-sm text-on-surface-variant">Room Remote</p>
        </div>
        <div className="flex items-center gap-xs rounded-full glass px-sm py-xs text-label-sm">
          <span className={cn('h-2 w-2 rounded-full', connected ? 'animate-pulse bg-secondary' : 'bg-error')} />
          {connected ? 'Linked' : 'Linking…'}
        </div>
      </header>

      {/* now playing */}
      <div className="glass glass-edge rounded-xl p-md">
        <p className="text-label-sm uppercase tracking-widest text-secondary">
          {live ? 'Now on stage' : 'Loaded · standby'}
        </p>
        <h2 className="mt-xs text-headline-md">{exp.title}</h2>
        <p className="text-label-md text-on-surface-variant">{exp.tagline}</p>

        <div className="mt-md flex items-center justify-center gap-lg">
          <button
            onClick={() => {
              haptic();
              const list = useStore.getState().experiences;
              const i = list.findIndex((e) => e.id === exp.id);
              loadExperience(list[(i - 1 + list.length) % list.length].id);
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full glass"
          >
            <Icon name="skip_previous" filled />
          </button>
          <button
            onClick={() => {
              haptic();
              if (!live) goLive(true);
              else togglePlay();
            }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_0_30px_rgba(75,142,255,0.4)] active:scale-95"
          >
            <Icon name={live && playing ? 'pause' : 'play_arrow'} filled size={40} />
          </button>
          <button
            onClick={() => {
              haptic();
              const list = useStore.getState().experiences;
              const i = list.findIndex((e) => e.id === exp.id);
              loadExperience(list[(i + 1) % list.length].id);
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full glass"
          >
            <Icon name="skip_next" filled />
          </button>
        </div>
      </div>

      {/* scenes */}
      <section>
        <p className="mb-sm text-label-sm uppercase tracking-widest text-on-surface-variant">Scenes</p>
        <div className="grid grid-cols-2 gap-base">
          {SCENES.map((s) => {
            const active = exp.sceneId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  haptic();
                  loadExperience(`exp-${s.id}`);
                }}
                className={cn(
                  'rounded-lg border p-md text-left transition-all',
                  active ? 'border-primary bg-primary/10' : 'border-white/10 glass',
                )}
              >
                <span
                  className="mb-sm block h-2 w-8 rounded-full"
                  style={{ background: s.accent }}
                />
                <p className="text-label-md font-semibold">{s.name}</p>
                <p className="text-[11px] text-on-surface-variant">{s.category}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* lighting */}
      <section>
        <p className="mb-sm text-label-sm uppercase tracking-widest text-on-surface-variant">Lighting</p>
        <div className="grid grid-cols-4 gap-base">
          {LIGHTS.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                haptic();
                patch({ lighting: l.id });
              }}
              className={cn(
                'flex flex-col items-center gap-xs rounded-lg p-sm transition-all',
                lighting === l.id ? 'bg-primary text-on-primary' : 'glass text-on-surface-variant',
              )}
            >
              <Icon name={l.icon} />
              <span className="text-[11px]">{l.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* sliders */}
      <section className="glass rounded-xl p-md space-y-md">
        <div>
          <div className="mb-xs flex items-center justify-between text-label-md">
            <span className="flex items-center gap-xs text-on-surface-variant">
              <Icon name="volume_up" size={18} /> Volume
            </span>
            <span>{volume}%</span>
          </div>
          <Slider value={volume} onChange={(v) => patch({ volume: v })} />
        </div>
        <div>
          <div className="mb-xs flex items-center justify-between text-label-md">
            <span className="flex items-center gap-xs text-on-surface-variant">
              <Icon name="light_mode" size={18} /> Light intensity
            </span>
            <span>{lightIntensity}%</span>
          </div>
          <Slider value={lightIntensity} onChange={(v) => patch({ lightIntensity: v })} />
        </div>
        <div>
          <div className="mb-xs flex items-center justify-between text-label-md">
            <span className="flex items-center gap-xs text-on-surface-variant">
              <Icon name="brightness_6" size={18} /> Scene intensity
            </span>
            <span>{Math.round(params.intensity * 100)}%</span>
          </div>
          <Slider value={params.intensity} min={0} max={1} step={0.01} onChange={(v) => setParam('intensity', v)} />
        </div>
      </section>

      {/* power */}
      <button
        onClick={() => {
          haptic();
          goLive(!live);
        }}
        className={cn(
          'mt-auto flex items-center justify-center gap-base rounded-xl py-md text-label-md font-bold transition-all active:scale-[0.98]',
          live ? 'bg-error text-on-error' : 'bg-primary-container text-on-primary-container',
        )}
      >
        <Icon name="power_settings_new" />
        {live ? 'Stop Output' : 'Go Live'}
      </button>
    </div>
  );
}
