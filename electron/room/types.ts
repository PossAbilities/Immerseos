// Room geometry contract — MAIN side. Structurally identical to src/lib/room.ts
// (renderer). JSON IPC boundary; keep the two in sync.

export type SurfaceId = 'left' | 'right' | 'centre' | 'floor' | 'back' | 'ceiling' | string;

/** The learned mapping from a sensor's raw input space to one surface. */
export interface SurfaceTouchMapping {
  sensorId: string;
  region: { x0: number; y0: number; x1: number; y1: number };
  flipX?: boolean;
  flipY?: boolean;
  capturedAt: number;
  sampleCount: number;
}

export interface SurfaceDef {
  id: SurfaceId;
  label: string;
  enabled: boolean;
  displayId?: number; // Electron screen id that renders this surface
  projectorDeviceId?: string; // optional link to a hardware ProjectorConfig.id
  touch?: SurfaceTouchMapping;
}

export interface RoomProfile {
  version: 1;
  setupComplete: boolean;
  surfaces: SurfaceDef[];
  updatedAt: number;
}

export interface DisplayInfo {
  id: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  primary: boolean;
}

export function defaultRoomProfile(): RoomProfile {
  const s = (id: SurfaceId, label: string, enabled: boolean): SurfaceDef => ({
    id,
    label,
    enabled,
  });
  return {
    version: 1,
    setupComplete: false,
    surfaces: [
      s('left', 'Left Wall', true),
      s('centre', 'Centre Wall', true),
      s('right', 'Right Wall', true),
      s('floor', 'Floor', true),
      s('back', 'Back Wall', false),
      s('ceiling', 'Ceiling', false),
    ],
    updatedAt: Date.now(),
  };
}
