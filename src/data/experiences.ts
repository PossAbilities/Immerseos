// The seed Experience Library. Built-in experiences wrap the generative scenes;
// the Creator tool adds user-authored ones on top (persisted to localStorage).

import type { Experience } from '@/lib/types';
import { SCENES } from '@/engine/scenes';

const DURATIONS: Record<string, number> = {
  'nebula-drift': 525,
  'deep-sea': 480,
  'zen-void': 900,
  'digital-forest': 600,
  'neon-pulse': 360,
  'orions-edge': 540,
  'aurora-flow': 720,
  'ember-calm': 1200,
};

export const BUILTIN_EXPERIENCES: Experience[] = SCENES.map((s) => ({
  id: `exp-${s.id}`,
  title: s.name,
  category: s.category,
  sceneId: s.id,
  tagline: s.tagline,
  description: s.description,
  accent: s.accent,
  durationSec: DURATIONS[s.id] ?? 480,
  builtIn: true,
  createdAt: 0,
  params: { ...s.defaults },
  layers: [
    {
      id: `${s.id}-base`,
      type: 'scene',
      refId: s.id,
      label: s.name,
      start: 0,
      duration: DURATIONS[s.id] ?? 480,
    },
  ],
  audioTrack: 'Ambient_Loop_Sub.wav',
}));

const STORAGE_KEY = 'immerseos.experiences.v1';

export function loadUserExperiences(): Experience[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Experience[];
  } catch {
    return [];
  }
}

export function saveUserExperiences(list: Experience[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.filter((e) => !e.builtIn)));
  } catch {
    /* storage may be unavailable (e.g. private mode) — non-fatal */
  }
}
