// Single source of truth for things the desktop control and the phone remote
// must agree on. Previously these arrays were copy-pasted across pages and had
// already started to drift.

import type { LightingPreset, SceneParams } from './types';

export const LIGHTING_PRESETS: {
  id: LightingPreset;
  icon: string;
  title: string;
  sub: string;
}[] = [
  { id: 'ambient', icon: 'lightbulb', title: 'Ambient Glow', sub: 'Sync with content' },
  { id: 'blackout', icon: 'dark_mode', title: 'Theater Black', sub: 'Total blackout' },
  { id: 'daylight', icon: 'wb_sunny', title: 'Daylight', sub: 'Full house lights' },
  { id: 'accent', icon: 'palette', title: 'Accent Wash', sub: 'Tinted edges' },
];

export const SCENE_PARAM_CONFIG: {
  key: keyof SceneParams;
  label: string;
  icon: string;
  max: number;
}[] = [
  { key: 'intensity', label: 'Intensity', icon: 'brightness_6', max: 1 },
  { key: 'speed', label: 'Motion Speed', icon: 'speed', max: 2 },
  { key: 'hue', label: 'Colour Shift', icon: 'palette', max: 1 },
  { key: 'scale', label: 'Scale', icon: 'zoom_out_map', max: 2 },
];

/** Format a 0..1 (or 0..2) param value for display. Hue reads as degrees. */
export function formatParam(key: keyof SceneParams, value: number): string {
  return key === 'hue'
    ? `${Math.round(value * 360)}°`
    : `${Math.round(value * 100)}%`;
}
