// Browsers hard-cap the number of simultaneous WebGL contexts (~16 in Chrome).
// ImmerseOS shows live scene previews everywhere — a Library page alone wants a
// dozen — so we ration contexts through a tiny global budget. A Stage only
// renders live while it holds a slot; everything else falls back to a calm
// animated gradient poster. Combined with viewport-gating in <Stage>, this keeps
// us comfortably under the cap no matter how many experiences exist.

const MAX_CONTEXTS = 8;
let inUse = 0;

export function acquireContext(): boolean {
  if (inUse >= MAX_CONTEXTS) return false;
  inUse++;
  return true;
}

export function releaseContext() {
  if (inUse > 0) inUse--;
}
