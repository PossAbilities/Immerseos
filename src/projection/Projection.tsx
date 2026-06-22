import { useEffect, useRef, useState } from 'react';
import { Stage } from '@/components/Stage';
import { useStore, currentExperience } from '@/store/useStore';
import { onSurfaceTouch } from '@/lib/touchBus';
import type { LightingPreset } from '@/lib/types';

const LIGHT_OVERLAY: Record<LightingPreset, string> = {
  ambient: 'transparent',
  blackout: 'rgba(0,0,0,0.92)',
  daylight: 'rgba(255,250,235,0.10)',
  accent: 'transparent',
};

interface Ripple {
  id: number;
  x: number;
  y: number;
}

// Which wall this projection window is showing, from the URL hash (#surface=left).
function mySurface(): string | null {
  const m = location.hash.match(/surface=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Interactive touch ripples for this surface, fed by the touch bus. */
function TouchRipples() {
  const surface = useRef(mySurface()).current;
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    return onSurfaceTouch((t) => {
      if (surface && t.surface !== surface) return; // only my wall
      if (t.phase === 'up') return;
      const id = seq.current++;
      setRipples((r) => [...r, { id, x: t.x, y: t.y }]);
      window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 800);
    });
  }, [surface]);

  return (
    <div className="pointer-events-none absolute inset-0">
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${r.x * 100}%`,
            top: `${r.y * 100}%`,
            width: 120,
            height: 120,
            border: '2px solid rgba(173,198,255,0.9)',
            boxShadow: '0 0 40px rgba(75,142,255,0.6)',
            animation: 'pulse-slow 0.8s ease-out forwards',
          }}
        />
      ))}
    </div>
  );
}

/**
 * The output surface shown on the room's projectors / second display.
 * It is a pure mirror of the shared room state — every control surface and
 * phone remote drives exactly what renders here.
 */
export function Projection() {
  const exp = useStore(currentExperience);
  const params = useStore((s) => s.params);
  const playing = useStore((s) => s.playing);
  const live = useStore((s) => s.live);
  const lighting = useStore((s) => s.lighting);
  const lightIntensity = useStore((s) => s.lightIntensity);
  const [idleHint, setIdleHint] = useState(true);

  useEffect(() => {
    if (live) setIdleHint(false);
  }, [live]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {live ? (
        <>
          <Stage
            sceneId={exp.sceneId}
            params={params}
            playing={playing}
            className="h-full w-full"
          />
          {/* lighting wash / blackout */}
          <div
            className="pointer-events-none absolute inset-0 transition-all duration-700"
            style={{
              background: LIGHT_OVERLAY[lighting],
              opacity: lighting === 'blackout' ? 1 : (100 - lightIntensity) / 200,
            }}
          />
          <TouchRipples />
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center text-center">
          <h1 className="text-headline-xl font-bold tracking-tight text-primary">ImmerseOS</h1>
          {idleHint && (
            <p className="mt-md animate-pulse text-body-lg text-on-surface-variant">
              Stage ready · waiting for the operator to go live
            </p>
          )}
        </div>
      )}
    </div>
  );
}
