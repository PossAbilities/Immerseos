import { useEffect, useState } from 'react';
import { Stage } from '@/components/Stage';
import { useStore, currentExperience } from '@/store/useStore';
import type { LightingPreset } from '@/lib/types';

const LIGHT_OVERLAY: Record<LightingPreset, string> = {
  ambient: 'transparent',
  blackout: 'rgba(0,0,0,0.92)',
  daylight: 'rgba(255,250,235,0.10)',
  accent: 'transparent',
};

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
