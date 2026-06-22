import type { SurfaceId } from '../room/types.js';
import type { SensorManager } from './SensorManager.js';
import type { CalibrationProgress, CaptureResult, RawTouchPoint } from './types.js';

const WINDOW_MS = 4000;
const MIN_SAMPLES = 12;
const MIN_AREA = 0.002; // reject a stationary single-point touch

/**
 * Drives the interactive "touch the LEFT wall" step. While capturing it records
 * every touch, then derives which sensor saw the most activity (that's the
 * sensor pointing at the surface) and the bounding region of those points in
 * the sensor's input space — the slice that maps to the surface.
 */
export class CalibrationService {
  private unsub?: () => void;
  private timer?: NodeJS.Timeout;
  private progressTimer?: NodeJS.Timeout;
  private samples: RawTouchPoint[] = [];
  private started = 0;
  private pending?: { surfaceId: SurfaceId; resolve: (r: CaptureResult) => void };

  constructor(
    private sensors: SensorManager,
    private onProgress: (p: CalibrationProgress) => void,
  ) {}

  begin(surfaceId: SurfaceId): Promise<CaptureResult> {
    // settle any in-flight capture as aborted so its awaited promise never hangs
    this.cancel();
    this.samples = [];
    this.started = Date.now();
    this.unsub = this.sensors.onTouch((p) => this.samples.push(p));

    this.progressTimer = setInterval(() => {
      this.onProgress({
        surfaceId,
        samples: this.samples.length,
        remainingMs: Math.max(0, WINDOW_MS - (Date.now() - this.started)),
        dominantSensorId: this.dominantSensor()?.sensorId,
      });
    }, 200);

    return new Promise((resolve) => {
      this.pending = { surfaceId, resolve };
      this.timer = setTimeout(() => {
        const result = this.derive(surfaceId);
        this.stopListening();
        this.pending = undefined;
        resolve(result);
      }, WINDOW_MS);
    });
  }

  /** Abort an in-flight capture, resolving its promise so callers never hang. */
  cancel() {
    if (this.pending) {
      const { surfaceId, resolve } = this.pending;
      this.pending = undefined;
      resolve({ ok: false, surfaceId, sampleCount: 0, message: 'Calibration cancelled.' });
    }
    this.stopListening();
  }

  private stopListening() {
    this.unsub?.();
    this.unsub = undefined;
    if (this.timer) clearTimeout(this.timer);
    if (this.progressTimer) clearInterval(this.progressTimer);
    this.timer = undefined;
    this.progressTimer = undefined;
  }

  private dominantSensor(): { sensorId: string; points: RawTouchPoint[] } | null {
    const bySensor = new Map<string, RawTouchPoint[]>();
    for (const p of this.samples) {
      const arr = bySensor.get(p.sensorId) ?? [];
      arr.push(p);
      bySensor.set(p.sensorId, arr);
    }
    let best: { sensorId: string; points: RawTouchPoint[] } | null = null;
    for (const [sensorId, points] of bySensor) {
      if (!best || points.length > best.points.length) best = { sensorId, points };
    }
    return best;
  }

  private derive(surfaceId: SurfaceId): CaptureResult {
    const dom = this.dominantSensor();
    if (!dom || dom.points.length < MIN_SAMPLES) {
      return {
        ok: false,
        surfaceId,
        sampleCount: dom?.points.length ?? 0,
        message: 'Not enough touch detected — try again and swipe across the whole surface.',
      };
    }
    // 5th/95th percentile bounds reject stray blobs, then a small pad.
    const xs = dom.points.map((p) => p.x).sort((a, b) => a - b);
    const ys = dom.points.map((p) => p.y).sort((a, b) => a - b);
    // nearest-rank percentile: index q*(N-1), so 0.95 stays below the max and
    // actually trims top-end stray blobs (q*N would collapse to the maximum).
    const pct = (arr: number[], q: number) =>
      arr[Math.max(0, Math.min(arr.length - 1, Math.round(q * (arr.length - 1))))];
    const pad = 0.03;
    const region = {
      x0: Math.max(0, pct(xs, 0.05) - pad),
      y0: Math.max(0, pct(ys, 0.05) - pad),
      x1: Math.min(1, pct(xs, 0.95) + pad),
      y1: Math.min(1, pct(ys, 0.95) + pad),
    };
    const area = (region.x1 - region.x0) * (region.y1 - region.y0);
    if (area < MIN_AREA) {
      return {
        ok: false,
        surfaceId,
        sensorId: dom.sensorId,
        sampleCount: dom.points.length,
        message: 'Touches were too clustered — swipe across more of the surface and retry.',
      };
    }
    return {
      ok: true,
      surfaceId,
      sensorId: dom.sensorId,
      region,
      sampleCount: dom.points.length,
      message: `Captured ${dom.points.length} points from sensor ${dom.sensorId}.`,
    };
  }
}
