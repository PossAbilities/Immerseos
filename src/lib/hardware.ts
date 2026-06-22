// Hardware control contract — RENDERER side (UI, preload typings, bridge).
//
// These shapes cross the IPC boundary to the Electron main process, where an
// identical definition lives in `electron/hardware/types.ts`. The two files are
// kept structurally identical on purpose: the main and renderer TypeScript
// projects compile separate trees, and IPC is structurally typed (JSON), so a
// shared shape in both places is type-safe without entangling the two builds.
// If you change one, change the other.

import type { LightingPreset } from './types';

export type DeviceKind = 'projector' | 'lighting' | 'audio';
export type DeviceStatus = 'offline' | 'connecting' | 'online' | 'error';

export interface ProjectorConfig {
  id: string;
  kind: 'projector';
  name: string;
  enabled: boolean;
  protocol: 'pjlink';
  host: string;
  port: number; // PJLink default 4352
  password?: string;
  inputOnLive?: string; // PJLink input code, e.g. '31' = HDMI1
}

export interface LightingChannels {
  master?: number; // 1-based DMX channel for the dimmer
  red?: number;
  green?: number;
  blue?: number;
}

export interface LightingPresetLevels {
  master: number; // 0..255
  r: number;
  g: number;
  b: number;
}

export interface LightingConfig {
  id: string;
  kind: 'lighting';
  name: string;
  enabled: boolean;
  protocol: 'artnet';
  host: string; // node IP or broadcast address
  port: number; // Art-Net default 6454
  universe: number;
  channels: LightingChannels;
  presets: Record<LightingPreset, LightingPresetLevels>;
}

export interface AudioConfig {
  id: string;
  kind: 'audio';
  name: string;
  enabled: boolean;
  protocol: 'osc';
  host: string;
  port: number;
  volumeAddress: string; // e.g. '/room/master/volume'
  muteAddress?: string; // e.g. '/room/master/mute'
}

export type DeviceConfig = ProjectorConfig | LightingConfig | AudioConfig;

export interface HardwareConfig {
  enabled: boolean; // master switch; off => pure on-screen simulation
  devices: DeviceConfig[];
}

export interface DeviceState {
  id: string;
  status: DeviceStatus;
  lastError?: string;
  lastSeen?: number;
}

/** The slice of room state the hardware actually cares about. */
export interface HardwareRoomState {
  live: boolean;
  playing: boolean;
  volume: number; // 0..100
  muted: boolean;
  lighting: LightingPreset;
  lightIntensity: number; // 0..100
  tintHue: number; // 0..1, derived from the active scene's hue
}

/** Sensible factory defaults for newly-added devices in the Settings UI. */
export function defaultPresetLevels(): Record<LightingPreset, LightingPresetLevels> {
  return {
    ambient: { master: 160, r: 120, g: 150, b: 255 },
    blackout: { master: 0, r: 0, g: 0, b: 0 },
    daylight: { master: 255, r: 255, g: 250, b: 235 },
    accent: { master: 200, r: 180, g: 120, b: 255 },
  };
}
