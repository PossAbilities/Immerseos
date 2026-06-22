// Sensor / touch contract — RENDERER side. Structurally identical to
// electron/sensors/types.ts. Keep the two in sync.

import type { SurfaceId } from './room';

export type SensorStatus = 'offline' | 'listening' | 'active' | 'error';

export interface SensorConfig {
  id: string;
  name: string;
  enabled: boolean;
  protocol: 'tuio';
  port: number;
  bind?: string;
}

export interface SensorsConfig {
  enabled: boolean;
  sensors: SensorConfig[];
}

export interface SurfaceTouch {
  surface: SurfaceId;
  x: number;
  y: number;
  phase: 'down' | 'move' | 'up';
  sessionId: number;
  t: number;
}

export interface SensorState {
  id: string;
  status: SensorStatus;
  lastError?: string;
  lastPacketAt?: number;
  pointsPerSec?: number;
}

export interface DiscoveredSensor {
  host: string;
  port: number;
  protocol: 'tuio';
  packetCount: number;
}

export interface CalibrationProgress {
  surfaceId: SurfaceId;
  samples: number;
  remainingMs: number;
  dominantSensorId?: string;
}

export interface CaptureResult {
  ok: boolean;
  surfaceId: SurfaceId;
  sensorId?: string;
  region?: { x0: number; y0: number; x1: number; y1: number };
  sampleCount: number;
  message: string;
}

export function defaultSensorsConfig(): SensorsConfig {
  return { enabled: false, sensors: [] };
}
