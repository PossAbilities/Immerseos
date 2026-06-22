import { useEffect, useRef, useState } from 'react';
import { ShaderRenderer } from '@/engine/webgl';
import { getScene } from '@/engine/scenes';
import { acquireContext, releaseContext } from '@/engine/contextBudget';
import type { SceneParams } from '@/lib/types';

interface StageProps {
  sceneId: string;
  params: SceneParams;
  playing?: boolean;
  className?: string;
}

/**
 * Renders a live generative scene to a WebGL canvas. Used for the small preview
 * in Theater Control, the Creator viewport and the full-screen Projection output.
 *
 * To stay under the browser's WebGL-context cap (~16) when many previews are on
 * screen at once, a Stage only goes live while it is in/near the viewport AND a
 * context budget slot is free. Otherwise it shows a calm animated poster built
 * from the scene's accent colour, so the grid still looks alive.
 */
export function Stage({ sceneId, params, playing = true, className }: StageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ShaderRenderer | null>(null);
  const hasSlot = useRef(false);
  const [visible, setVisible] = useState(false);
  const [live, setLive] = useState(false);

  // keep latest params/playing in refs so the render loop reads fresh values
  const paramsRef = useRef(params);
  const playingRef = useRef(playing);
  paramsRef.current = params;
  playingRef.current = playing;

  // observe whether we're on screen
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // acquire/release a renderer when visibility changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!visible || !canvas) return;
    if (!acquireContext()) {
      setLive(false); // budget full → poster
      return;
    }
    hasSlot.current = true;

    let renderer: ShaderRenderer | null = null;
    const onLost = (e: Event) => {
      e.preventDefault();
      setLive(false);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    try {
      renderer = new ShaderRenderer(canvas, getScene(sceneId).fragment, () => {
        const p = paramsRef.current;
        return {
          intensity: playingRef.current ? p.intensity : p.intensity * 0.55,
          speed: playingRef.current ? p.speed : 0.04,
          hue: p.hue,
          scale: p.scale,
        };
      });
      rendererRef.current = renderer;
      renderer.start_();
      setLive(true);
    } catch (err) {
      console.warn('Stage: WebGL unavailable, using poster.', err);
      setLive(false);
    }

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      renderer?.dispose();
      rendererRef.current = null;
      if (hasSlot.current) {
        releaseContext();
        hasSlot.current = false;
      }
    };
    // sceneId intentionally excluded — scene swaps are handled cheaply below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // hot-swap the shader on scene change without churning the GL context
  useEffect(() => {
    if (rendererRef.current) {
      try {
        rendererRef.current.setScene(getScene(sceneId).fragment);
      } catch (err) {
        console.warn('Stage: scene swap failed.', err);
      }
    }
  }, [sceneId]);

  const accent = getScene(sceneId).accent;

  return (
    <div ref={wrapRef} className={className} style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ display: live ? 'block' : 'none' }}
      />
      {!live && (
        <div
          className="animate-pulse-slow h-full w-full"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${accent}40, #0c0e12 75%)`,
          }}
        />
      )}
    </div>
  );
}
