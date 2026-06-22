// Hardware control contract — MAIN side (HardwareManager, drivers, IPC).
//
// Structurally identical to `src/lib/hardware.ts` (the renderer copy). The two
// projects compile separate trees and communicate over JSON IPC, so the shape
// is duplicated here rather than imported across the build boundary. Keep them
// in sync — if you change one, change the other.

export type LightingPreset = 'ambient' | 'blackout' | 'daylight' | 'accent';

export type DeviceKind = 'projector' | 'lighting' | 'audio';
export type DeviceStatus = 'offline' | 'connecting' | 'online' | 'error';

export interface ProjectorConfig {
  id: string;
  kind: 'projector';
  name: string;
  enabled: boolean;
  protocol: 'pjlink';
  host: string;
  port: number;
  password?: string;
  inputOnLive?: string;
}

export interface LightingChannels {
  master?: number;
  red?: number;
  green?: number;
  blue?: number;
}

export interface LightingPresetLevels {
  master: number;
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
  host: string;
  port: number;
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
  volumeAddress: string;
  muteAddress?: string;
}

export type DeviceConfig = ProjectorConfig | LightingConfig | AudioConfig;

export interface HardwareConfig {
  enabled: boolean;
  devices: DeviceConfig[];
}

export interface DeviceState {
  id: string;
  status: DeviceStatus;
  lastError?: string;
  lastSeen?: number;
}

export interface HardwareRoomState {
  live: boolean;
  playing: boolean;
  volume: number;
  muted: boolean;
  lighting: LightingPreset;
  lightIntensity: number;
  tintHue: number;
}
