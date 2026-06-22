// Helpers for the authored multi-scene / wall-editor model. An experience can be
// a simple single generative scene (the original model) or a list of authored
// Scenes, each holding per-surface content (background + placeable elements).

import type { CSSProperties } from 'react';
import type { BackgroundType, Experience, Scene, SceneElement, ElementType, SurfaceContent } from './types';

const VIDEO_RE = /\.(mp4|mov|webm|ogg)(\?|$)/i;
export const isVideoSrc = (s?: string) => !!s && VIDEO_RE.test(s);

// The 360 modes use true equirectangular reprojection (see equirectView); the
// remaining non-per-surface modes (flat-panorama, colour) use a CSS background.
const MODE_360 = new Set<BackgroundType>([
  'equirectangular',
  'immersive-panorama',
  'immersive-cube',
  'youtube-equiangular',
  'streetview',
]);

/**
 * The CSS background for one wall — used only for flat-panorama (a wide image
 * sliced across the walls) and colour. Returns undefined for per-surface, the
 * 360 modes (handled by equirectView), and video panoramas.
 */
export function panoramaStyle(scene: Scene, index: number, count: number): CSSProperties | undefined {
  const t = scene.backgroundType ?? 'per-surface';
  if (t === 'colour') return { background: scene.panoramaColor ?? '#000000' };
  if (t !== 'flat-panorama') return undefined;
  const src = scene.panoramaSrc;
  if (!src || isVideoSrc(src)) return undefined; // no image to slice / video handled elsewhere
  return {
    backgroundImage: `url(${src})`,
    backgroundSize: `${count * 100}% 100%`,
    backgroundPosition: count > 1 ? `${(index / (count - 1)) * 100}% 50%` : 'center',
    backgroundRepeat: 'no-repeat',
  };
}

/** Equirectangular reprojection parameters for a wall, or null if not a 360 mode. */
export function equirectView(
  scene: Scene,
  surfaceId: string,
  wallOrder: string[],
  isFloor: boolean,
): { src: string; yawDeg: number; pitchDeg: number; hfovDeg: number } | null {
  const t = scene.backgroundType ?? 'per-surface';
  if (!MODE_360.has(t) || !scene.panoramaSrc) return null;
  if (isFloor) return { src: scene.panoramaSrc, yawDeg: 0, pitchDeg: -90, hfovDeg: 55 };
  const n = Math.max(wallOrder.length, 1);
  const i = Math.max(0, wallOrder.indexOf(surfaceId));
  // walls span the front arc, ~90° each, centred on the room's forward axis
  return { src: scene.panoramaSrc, yawDeg: (i - (n - 1) / 2) * 90, pitchDeg: 0, hfovDeg: 45 };
}

/** The content to render for a wall, folding in a flat-panorama video background. */
export function wallContent(scene: Scene, surfaceId: string): SurfaceContent {
  const base = scene.surfaces[surfaceId] ?? { elements: [] };
  if (scene.backgroundType === 'flat-panorama' && isVideoSrc(scene.panoramaSrc)) {
    return { ...base, backgroundSrc: scene.panoramaSrc };
  }
  return base;
}

/** The surfaces the wall editor exposes (the common immersive-room set). */
export const EDITOR_SURFACES: { id: string; label: string }[] = [
  { id: 'left', label: 'Left Wall' },
  { id: 'centre', label: 'Centre Wall' },
  { id: 'right', label: 'Right Wall' },
  { id: 'floor', label: 'Floor' },
];

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${seq++}`;

export function emptySurface(): SurfaceContent {
  return { elements: [] };
}

export function newScene(name: string, backgroundSceneId?: string): Scene {
  const surfaces: Record<string, SurfaceContent> = {};
  for (const s of EDITOR_SURFACES) {
    surfaces[s.id] = { elements: [], backgroundSceneId };
  }
  return { id: uid('scene'), name, surfaces };
}

const ELEMENT_DEFAULTS: Record<ElementType, Partial<SceneElement>> = {
  image: { w: 0.3, h: 0.3, src: '' },
  video: { w: 0.4, h: 0.3, src: '' },
  web: { w: 0.4, h: 0.3, src: 'https://' },
  text: { w: 0.5, h: 0.15, text: 'Double-click to edit', color: '#ffffff', fontSize: 0.12 },
  hotspot: { w: 0.16, h: 0.16, label: 'Tap', color: '#adc6ff' },
  activity: { w: 1, h: 1, activityId: 'particles' },
  timer: { w: 0.24, h: 0.16, duration: 60, color: '#adc6ff' },
  score: { w: 0.24, h: 0.16, label: 'Score', color: '#7ee0a0' },
  progress: { w: 0.5, h: 0.08, duration: 30, color: '#4b8eff' },
  lock: { w: 0.3, h: 0.42, lockKind: 'numberpad', code: '1234', color: '#c084fc', label: 'Enter code' },
  wipe: { w: 0.5, h: 0.4, src: '', color: '#111317' },
};

export function newElement(type: ElementType): SceneElement {
  const d = ELEMENT_DEFAULTS[type];
  return {
    id: uid(type),
    type,
    x: 0.5 - (d.w ?? 0.3) / 2,
    y: 0.5 - (d.h ?? 0.3) / 2,
    w: d.w ?? 0.3,
    h: d.h ?? 0.3,
    ...d,
  };
}

/**
 * Return the experience's authored scenes, creating a sensible default scene
 * from its single generative background if it has none yet (so the editor and
 * the runtime can always rely on a non-empty scene list).
 */
export function getScenes(exp: Experience): Scene[] {
  if (exp.scenes && exp.scenes.length > 0) return exp.scenes;
  return [newScene('Scene 1', exp.sceneId)];
}
