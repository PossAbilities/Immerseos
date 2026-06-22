import { useEffect, useRef } from 'react';
import { ShaderRenderer } from '@/engine/webgl';
import { getScene } from '@/engine/scenes';
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
 */
export function Stage({ sceneId, params, playing = true, className }: StageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ShaderRenderer | null>(null);
  // keep latest params/playing in refs so the render loop reads fresh values
  const paramsRef = useRef(params);
  const playingRef = useRef(playing);
  paramsRef.current = params;
  playingRef.current = playing;

  // (re)create renderer when the scene changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = getScene(sceneId);
    let renderer: ShaderRenderer;
    try {
      renderer = new ShaderRenderer(canvas, scene.fragment, () => {
        const p = paramsRef.current;
        return {
          time: 0,
          intensity: playingRef.current ? p.intensity : p.intensity * 0.55,
          speed: playingRef.current ? p.speed : 0.04,
          hue: p.hue,
          scale: p.scale,
        };
      });
    } catch (err) {
      // WebGL unavailable — leave the canvas as a calm gradient fallback.
      canvas.style.background =
        'radial-gradient(circle at 50% 40%, #1b2a55, #0c0e12)';
      console.warn('Stage: ', err);
      return;
    }
    rendererRef.current = renderer;
    renderer.start_();
    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [sceneId]);

  return <canvas ref={canvasRef} className={className} />;
}
