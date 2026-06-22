import type { SensorSource } from './SensorSource.js';
import { TuioSource } from './sources/TuioSource.js';
import type { RawTouchPoint, SensorConfig, SensorState, SensorsConfig } from './types.js';

/**
 * Inbound sibling of HardwareManager: owns the configured sensor sources, fans
 * their touch points into a single stream, and reports aggregated status.
 * Disabled master switch or no sensors → no sockets (graceful degradation;
 * the wizard then runs in simulated mode).
 */
export class SensorManager {
  private config: SensorsConfig = { enabled: false, sensors: [] };
  private sources = new Map<string, SensorSource>();
  private touchListeners = new Set<(p: RawTouchPoint) => void>();
  private statesCb?: (s: SensorState[]) => void;

  setConfig(cfg: SensorsConfig) {
    this.config = cfg;
    this.disposeSources();
    if (cfg.enabled) {
      for (const sc of cfg.sensors) {
        if (!sc.enabled) continue;
        const source = this.makeSource(sc);
        if (!source) continue;
        source.onStateChange(() => this.emitStates());
        source.onTouch((p) => this.touchListeners.forEach((cb) => cb(p)));
        this.sources.set(sc.id, source);
        source.start().catch(() => {
          /* source reports its own error status */
        });
      }
    }
    this.emitStates();
  }

  /** Subscribe to the merged touch stream. Returns an unsubscribe function. */
  onTouch(cb: (p: RawTouchPoint) => void): () => void {
    this.touchListeners.add(cb);
    return () => this.touchListeners.delete(cb);
  }
  onSensorStates(cb: (s: SensorState[]) => void) {
    this.statesCb = cb;
  }
  getStates(): SensorState[] {
    return [...this.sources.values()].map((s) => s.getState());
  }
  dispose() {
    this.disposeSources();
  }

  private makeSource(sc: SensorConfig): SensorSource | null {
    return sc.protocol === 'tuio' ? new TuioSource(sc) : null;
  }

  private disposeSources() {
    for (const s of this.sources.values()) {
      try {
        s.dispose();
      } catch {
        /* ignore */
      }
    }
    this.sources.clear();
  }

  private emitStates() {
    this.statesCb?.(this.getStates());
  }
}
