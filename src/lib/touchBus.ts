// A tiny pub/sub for transient surface touch events. Touches are high-frequency,
// ephemeral events — deliberately NOT stored in the Zustand room state. Any
// surface (Projection, an interactive Stage, a future Creator "trigger" layer)
// can subscribe and react to { surface, x, y, phase }.

import type { SurfaceTouch } from './sensors';

type TouchListener = (t: SurfaceTouch) => void;

const listeners = new Set<TouchListener>();

export function onSurfaceTouch(cb: TouchListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function emitSurfaceTouch(t: SurfaceTouch) {
  listeners.forEach((l) => l(t));
}
