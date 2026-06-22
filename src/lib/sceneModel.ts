// Helpers for the authored multi-scene / wall-editor model. An experience can be
// a simple single generative scene (the original model) or a list of authored
// Scenes, each holding per-surface content (background + placeable elements).

import type { Experience, Scene, SceneElement, ElementType, SurfaceContent } from './types';

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
