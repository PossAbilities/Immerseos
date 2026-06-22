import type { DeviceConfig, DeviceState, HardwareRoomState } from './types.js';

/**
 * Common contract every device driver implements so the HardwareManager never
 * has to special-case a protocol. Drivers own their own socket(s), coalesce
 * rapid `apply` calls, and must NEVER throw out of `apply` — failures flip the
 * device to `error` status and are surfaced via `onStateChange`.
 */
export interface Driver {
  readonly id: string;
  readonly kind: DeviceConfig['kind'];

  /** Open sockets / start any keep-alive polling. */
  connect(): Promise<void>;

  /** Push the relevant part of room state to the device (idempotent). */
  apply(state: HardwareRoomState): void;

  /** Tear down sockets and timers. */
  dispose(): void;

  /** Current connection/health snapshot. */
  getState(): DeviceState;

  /** Manager subscribes here to receive status changes. */
  onStateChange(cb: (s: DeviceState) => void): void;
}

/** Small base class handling status bookkeeping + change notification. */
export abstract class BaseDriver implements Driver {
  abstract readonly kind: DeviceConfig['kind'];
  private state: DeviceState;
  private cb?: (s: DeviceState) => void;

  constructor(public readonly id: string) {
    this.state = { id, status: 'offline' };
  }

  abstract connect(): Promise<void>;
  abstract apply(state: HardwareRoomState): void;
  abstract dispose(): void;

  getState(): DeviceState {
    return this.state;
  }

  onStateChange(cb: (s: DeviceState) => void) {
    this.cb = cb;
  }

  protected setStatus(status: DeviceState['status'], lastError?: string) {
    this.state = {
      id: this.id,
      status,
      lastError,
      lastSeen: status === 'online' ? Date.now() : this.state.lastSeen,
    };
    this.cb?.(this.state);
  }
}
