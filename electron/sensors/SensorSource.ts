import type { RawTouchPoint, SensorState } from './types.js';

/**
 * Inbound counterpart to the hardware Driver: a sensor source listens on a
 * socket and EMITS touch points, rather than receiving room state. Sources
 * never throw out of their callbacks — failures surface as `error` status.
 */
export interface SensorSource {
  readonly id: string;
  start(): Promise<void>;
  dispose(): void;
  getState(): SensorState;
  onStateChange(cb: (s: SensorState) => void): void;
  onTouch(cb: (p: RawTouchPoint) => void): void;
}

export abstract class BaseSensorSource implements SensorSource {
  private state: SensorState;
  private stateCb?: (s: SensorState) => void;
  protected touchCb?: (p: RawTouchPoint) => void;

  constructor(public readonly id: string) {
    this.state = { id, status: 'offline' };
  }

  abstract start(): Promise<void>;
  abstract dispose(): void;

  getState(): SensorState {
    return this.state;
  }
  onStateChange(cb: (s: SensorState) => void) {
    this.stateCb = cb;
  }
  onTouch(cb: (p: RawTouchPoint) => void) {
    this.touchCb = cb;
  }

  protected emit(p: RawTouchPoint) {
    this.touchCb?.(p);
  }

  protected setStatus(status: SensorState['status'], patch: Partial<SensorState> = {}) {
    this.state = { ...this.state, id: this.id, status, ...patch };
    this.stateCb?.(this.state);
  }
}
