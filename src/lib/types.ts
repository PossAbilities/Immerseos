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

// ---------------------------------------------------------------------------
// Authored scene model (wall editor). An experience may either be a simple
// single generative scene (sceneId/params, the original model) OR a richer
// multi-scene authored experience with per-surface content. Both are supported
// so existing experiences keep working.
// ---------------------------------------------------------------------------

export type ElementType =
  | 'image'
  | 'text'
  | 'hotspot'
  | 'video'
  | 'web'
  | 'activity'
  | 'timer'
  | 'score'
  | 'progress'
  | 'lock'
  | 'wipe';

export type LockKind = 'numberpad' | 'sliding' | 'descramble';

/** A placeable element on a surface within a scene. Coords are 0..1 surface-local. */
export interface SceneElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  // type-specific payload
  text?: string;
  src?: string; // image/video/web url
  color?: string;
  fontSize?: number; // for text, relative 0..1 of surface height
  activityId?: string; // for type 'activity'
  duration?: number; // seconds — timer / progress
  lockKind?: LockKind; // for type 'lock'
  code?: string; // unlock code for type 'lock'
  // hotspot / lock behaviour: navigate to another scene in the same experience
  targetSceneId?: string;
  label?: string;
}

/** What fills a surface behind the elements. */
export interface SurfaceContent {
  backgroundSceneId?: string; // a generative scene id
  backgroundSrc?: string; // or an image/video url
  backgroundMuted?: boolean; // mute a video background (default true)
  elements: SceneElement[];
}

/** One scene of an authored experience — content for each surface. */
export interface Scene {
  id: string;
  name: string;
  surfaces: Record<string, SurfaceContent>; // keyed by SurfaceId
  autoAdvanceSec?: number; // if set, advance to the next scene after N seconds
  nextSceneId?: string; // explicit next scene (defaults to the following one)
}

export type ExperienceVisibility = 'private' | 'team' | 'public';

/** Content classification shown as a card badge (mirrors the supplier's types). */
export type ContentType =
  | 'Scene'
  | 'Interactive'
  | 'Background'
  | '360 Video'
  | 'Video'
  | 'Quiz';

/** A saved, playable experience in the Library. */
export interface Experience {
  id: string;
  title: string;
  category: string;
  sceneId: string; // the primary generative scene (single-scene model)
  tagline: string;
  description: string;
  accent: string;
  durationSec: number;
  builtIn: boolean;
  createdAt: number;
  params: SceneParams;
  layers: Layer[];
  audioTrack?: string;
  // --- richer metadata (authored experiences) ---
  collectionId?: string;
  thumbnail?: string; // data URL or path
  screenshots?: string[];
  sector?: string;
  experienceType?: string;
  visibility?: ExperienceVisibility;
  canClone?: boolean;
  contentType?: ContentType;
  featured?: boolean;
  isNew?: boolean;
  saves?: number;
  likes?: number;
  owner?: string; // operator id who created it
  aspectRatio?: string; // editor surface render ratio, e.g. '16:9'
  // --- multi-scene authored content (optional) ---
  scenes?: Scene[];
}

/** A folder/project grouping experiences (e.g. "Summer of Love"). */
export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

/** The single source of truth shared between Control, Projection and Remote. */
export interface RoomState {
  /** the experience currently loaded on the stage */
  currentId: string;
  /**
   * A snapshot of the active experience, broadcast so the projection / remote
   * surfaces can render authored content that isn't in their own local library.
   */
  activeExperience?: Experience;
  /** within a multi-scene experience, the active scene id */
  activeSceneId?: string;
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
