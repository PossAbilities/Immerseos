import { useEffect, useRef, useState } from 'react';
import { Stage } from './Stage';
import { Icon } from './Icon';
import { getScene } from '@/engine/scenes';
import { cn } from '@/lib/cn';

const BOOT_STEPS = [
  'Initialising stage engine',
  'Mapping room surfaces',
  'Linking sensors & calibration',
  'Connecting projectors & lighting',
  'Loading experience library',
  'Ready',
];

const DURATION = 3200; // ms

/**
 * The ImmerseOS boot splash — a cinematic branded intro shown once when the
 * control app launches, then dissolves into the OS. Skippable with a click/key.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const start = useRef(performance.now());
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setLeaving(true);
    setTimeout(onDone, 650); // allow the fade-out to play
  };

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const p = Math.min(1, (performance.now() - start.current) / DURATION);
      setProgress(p);
      if (p >= 1) finish();
      else raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onKey = () => finish();
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepIndex = Math.min(BOOT_STEPS.length - 1, Math.floor(progress * BOOT_STEPS.length));

  return (
    <div
      onClick={finish}
      className={cn(
        'fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden bg-background transition-opacity duration-700',
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
    >
      <style>{`
        @keyframes io-ring { 0% { transform: scale(.6); opacity: .55 } 100% { transform: scale(2.6); opacity: 0 } }
        @keyframes io-rise { 0% { transform: translateY(14px); opacity: 0 } 100% { transform: translateY(0); opacity: 1 } }
        @keyframes io-sheen { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
      `}</style>

      {/* generative backdrop, dimmed */}
      <div className="absolute inset-0 opacity-50">
        <Stage sceneId="aurora-flow" params={getScene('aurora-flow').defaults} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" />
      </div>

      {/* emblem */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative mb-lg flex h-28 w-28 items-center justify-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="absolute h-24 w-24 rounded-full border border-primary/40"
              style={{ animation: `io-ring 2.6s ${i * 0.6}s ease-out infinite` }}
            />
          ))}
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-container shadow-[0_0_60px_rgba(75,142,255,0.6)]">
            <Icon name="settings_remote" filled size={44} className="text-on-primary-container" />
          </div>
        </div>

        <h1
          className="bg-gradient-to-r from-primary via-secondary to-tertiary bg-[length:200%_auto] bg-clip-text text-6xl font-bold tracking-tight text-transparent"
          style={{ animation: 'io-rise .8s ease-out both, io-sheen 4s linear infinite' }}
        >
          ImmerseOS
        </h1>
        <p className="mt-sm text-label-md uppercase tracking-[0.4em] text-on-surface-variant" style={{ animation: 'io-rise 1s .15s ease-out both' }}>
          The Operating System for Immersive Rooms
        </p>

        {/* progress */}
        <div className="mt-xl w-[340px]" style={{ animation: 'io-rise 1s .3s ease-out both' }}>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary shadow-[0_0_12px_#adc6ff] transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mt-sm flex items-center justify-between text-label-sm text-on-surface-variant">
            <span className="flex items-center gap-xs">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
              {BOOT_STEPS[stepIndex]}…
            </span>
            <span className="font-mono">{Math.round(progress * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-margin text-label-sm text-outline">v1.0 · PossAbilities · click to skip</div>
    </div>
  );
}
