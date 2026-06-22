// Sensor / touch-input contract — MAIN side. Structurally identical to
// src/lib/sensors.ts (renderer). Keep the two in sync.

import type { SurfaceId } from '../room/types.js';

export type SensorStatus = 'offline' | 'listening' | 'active' | 'error';

export interface SensorConfig {
  id: string;
  name: string;
  enabled: boolean;
  protocol: 'tuio';
  port: number; // TUIO default 3333
  bind?: string; // default 0.0.0.0
}

export interface SensorsConfig {
  enabled: boolean;
  sensors: SensorConfig[];
}

/** A normalized touch point as it leaves a sensor source (raw, pre-routing). */
export interface RawTouchPoint {
  sensorId: string;
  sessionId: number;
  x: number; // 0..1 in the sensor's own input space
  y: number;
  phase: 'down' | 'move' | 'up';
  t: number;
}

/** A touch after routing — located on a calibrated surface, surface-local coords. */
export interface SurfaceTouch {
  surface: SurfaceId;
  x: number; // 0..1 within the surface
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

/** Progress streamed to the wizard during an interactive calibration capture. */
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
