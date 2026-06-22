// Pure helpers for the Atoms engine — typed shared variables + simple event
// logic that turn an experience from a slideshow into an interactive app.
// Used by both the live control-surface engine and the in-editor Play preview.

import type { AtomDef, AtomEvent, AtomSet, AtomValue, AtomCmp } from './types';

// Predefined runtime atoms (always available, not user-defined).
export const SCENE_TIME = '__sceneTime';
export const EXPERIENCE_TIME = '__experienceTime';

export type AtomMap = Record<string, AtomValue>;

export function initialAtoms(defs: AtomDef[] | undefined): AtomMap {
  const m: AtomMap = { [SCENE_TIME]: 0, [EXPERIENCE_TIME]: 0 };
  for (const d of defs ?? []) m[d.id] = d.value;
  return m;
}

/** Reset scene-scoped atoms to their defaults (called on scene change). */
export function resetSceneAtoms(map: AtomMap, defs: AtomDef[] | undefined): AtomMap {
  const next: AtomMap = { ...map, [SCENE_TIME]: 0 };
  for (const d of defs ?? []) if (d.scope === 'scene') next[d.id] = d.value;
  return next;
}

function num(v: AtomValue | undefined): number {
  return typeof v === 'boolean' ? (v ? 1 : 0) : Number(v ?? 0);
}

export function applySets(map: AtomMap, sets: AtomSet[] | undefined): AtomMap {
  if (!sets?.length) return map;
  const next = { ...map };
  for (const s of sets) {
    const cur = next[s.atomId];
    if (s.op === 'toggle') next[s.atomId] = !cur;
    else if (s.op === 'add') next[s.atomId] = num(cur) + num(s.value);
    else next[s.atomId] = s.value ?? '';
  }
  return next;
}

export function compare(a: AtomValue | undefined, cmp: AtomCmp, b: AtomValue): boolean {
  // numeric comparison when both sides are number-like, else string equality
  const numeric = !isNaN(num(a)) && !isNaN(num(b)) && typeof b !== 'string';
  if (cmp === '==') return numeric ? num(a) === num(b) : String(a) === String(b);
  if (cmp === '!=') return numeric ? num(a) !== num(b) : String(a) !== String(b);
  const x = num(a), y = num(b);
  if (cmp === '>') return x > y;
  if (cmp === '<') return x < y;
  if (cmp === '>=') return x >= y;
  return x <= y; // '<='
}

export function eventHolds(map: AtomMap, e: AtomEvent): boolean {
  return compare(map[e.atomId], e.cmp, e.value);
}

export function atomLabel(id: string): string {
  if (id === SCENE_TIME) return 'Scene time (s)';
  if (id === EXPERIENCE_TIME) return 'Experience time (s)';
  return id;
}
