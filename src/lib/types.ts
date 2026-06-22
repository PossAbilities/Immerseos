// Shared domain types for ImmerseOS.

export type LightingPreset = 'ambient' | 'blackout' | 'daylight' | 'accent';

export interface SceneParams {
  intensity: number;
  speed: number;
  hue: number;
  scale: number;
}

/** A layer inside a composed experience (Creator tool). */
export interface Layer {
  id: string;
  type: 'scene' | 'video' | 'audio' | 'trigger';
  refId: string; // scene id, asset name, or trigger label
  label: string;
  start: number; // seconds on the master timeline
  duration: number; // seconds
}

/** A saved, playable experience in the Library. */
export interface Experience {
  id: string;
  title: string;
  category: string;
  sceneId: string; // the primary scene rendered on the walls
  tagline: string;
  description: string;
  accent: string;
  durationSec: number;
  builtIn: boolean;
  createdAt: number;
  params: SceneParams;
  layers: Layer[];
  audioTrack?: string;
}

/** The single source of truth shared between Control, Projection and Remote. */
export interface RoomState {
  /** the experience currently loaded on the stage */
  currentId: string;
  live: boolean; // is the projection output actually showing content
  playing: boolean;
  positionSec: number;
  volume: number; // 0..100
  muted: boolean;
  lighting: LightingPreset;
  lightIntensity: number; // 0..100
  params: SceneParams; // live overrides for the active scene
  updatedAt: number;
}

export type RoomPatch = Partial<Omit<RoomState, 'updatedAt'>>;

export type SurfaceRole = 'control' | 'projection' | 'remote';

/** Wire message exchanged between the three surfaces. */
export interface SyncMessage {
  kind: 'patch' | 'hello' | 'state' | 'presence' | 'touch';
  id: string; // unique per message, used to dedupe across transports
  origin: string;
  role?: SurfaceRole;
  patch?: RoomPatch;
  state?: RoomState;
  remotes?: number; // server-authoritative count of connected phone remotes
  // a routed surface touch, fanned out to projection/remote for interactivity
  touch?: import('./sensors').SurfaceTouch;
}
