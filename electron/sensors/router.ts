import type { RoomProfile } from '../room/types.js';
import type { RawTouchPoint, SurfaceTouch } from './types.js';

interface Mapping {
  surface: string;
  sensorId: string;
  region: { x0: number; y0: number; x1: number; y1: number };
  flipX?: boolean;
  flipY?: boolean;
  area: number;
}

/** Maps raw sensor touches onto calibrated surfaces with surface-local coords. */
export class TouchRouter {
  private bySensor = new Map<string, Mapping[]>();

  setProfile(profile: RoomProfile) {
    this.bySensor.clear();
    for (const s of profile.surfaces) {
      if (!s.enabled || !s.touch) continue;
      const r = s.touch.region;
      const m: Mapping = {
        surface: s.id,
        sensorId: s.touch.sensorId,
        region: r,
        flipX: s.touch.flipX,
        flipY: s.touch.flipY,
        area: Math.max(1e-6, (r.x1 - r.x0) * (r.y1 - r.y0)),
      };
      const list = this.bySensor.get(m.sensorId) ?? [];
      list.push(m);
      this.bySensor.set(m.sensorId, list);
    }
  }

  route(p: RawTouchPoint): SurfaceTouch | null {
    const candidates = this.bySensor.get(p.sensorId);
    if (!candidates) return null;
    // most specific (smallest) containing region wins
    let best: Mapping | undefined;
    for (const m of candidates) {
      const { x0, y0, x1, y1 } = m.region;
      if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) {
        if (!best || m.area < best.area) best = m;
      }
    }
    if (!best) return null;
    const { x0, y0, x1, y1 } = best.region;
    let sx = (p.x - x0) / Math.max(1e-6, x1 - x0);
    let sy = (p.y - y0) / Math.max(1e-6, y1 - y0);
    if (best.flipX) sx = 1 - sx;
    if (best.flipY) sy = 1 - sy;
    return {
      surface: best.surface,
      x: Math.max(0, Math.min(1, sx)),
      y: Math.max(0, Math.min(1, sy)),
      phase: p.phase,
      sessionId: p.sessionId,
      t: p.t,
    };
  }
}
