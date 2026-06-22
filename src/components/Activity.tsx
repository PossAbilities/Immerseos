import { useEffect, useRef } from 'react';
import { getActivity, type TouchPhase } from '@/activities/registry';
import { onSurfaceTouch } from '@/lib/touchBus';

/**
 * Runs an interactive activity on a canvas. Input comes from both on-screen
 * pointers (sandbox / testing) and real sensor touches on this surface (room).
 * When not interactive (e.g. in the editor) it animates as a live preview but
 * ignores input, so the element stays selectable/draggable.
 */
export function Activity({
  activityId,
  surface,
  interactive = true,
}: {
  activityId: string;
  surface?: string;
  interactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const inst = getActivity(activityId).create();
    const start = performance.now();
    let last = start;
    let raf = 0;

    const loop = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = canvas.clientWidth || 1;
      const ch = canvas.clientHeight || 1;
      if (canvas.width !== Math.floor(cw * dpr) || canvas.height !== Math.floor(ch * dpr)) {
        canvas.width = Math.floor(cw * dpr);
        canvas.height = Math.floor(ch * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      inst.frame({ ctx, w: cw, h: ch, dt, t: (now - start) / 1000 });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    let cleanupInput = () => {};
    if (interactive) {
      const norm = (clientX: number, clientY: number) => {
        const r = canvas.getBoundingClientRect();
        return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
      };
      const onPointer = (phase: TouchPhase) => (e: PointerEvent) => {
        if (phase === 'move' && e.buttons === 0) return;
        const { x, y } = norm(e.clientX, e.clientY);
        inst.touch(x, y, phase);
      };
      const down = onPointer('down'), move = onPointer('move'), up = onPointer('up');
      canvas.addEventListener('pointerdown', down);
      canvas.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      const offBus = onSurfaceTouch((t) => {
        if (surface && t.surface !== surface) return;
        inst.touch(t.x, t.y, t.phase);
      });
      cleanupInput = () => {
        canvas.removeEventListener('pointerdown', down);
        canvas.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        offBus();
      };
    }

    return () => {
      cancelAnimationFrame(raf);
      cleanupInput();
    };
  }, [activityId, surface, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full"
      style={{ touchAction: 'none', pointerEvents: interactive ? 'auto' : 'none' }}
    />
  );
}
