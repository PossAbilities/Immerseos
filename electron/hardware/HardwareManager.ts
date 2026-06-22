import type { Driver } from './Driver.js';
import { PjLinkDriver } from './drivers/PjLinkDriver.js';
import { ArtNetDriver } from './drivers/ArtNetDriver.js';
import { OscDriver } from './drivers/OscDriver.js';
import type {
  DeviceConfig,
  DeviceState,
  HardwareConfig,
  HardwareRoomState,
} from './types.js';

/**
 * Owns the set of active device drivers and turns the synced room state into
 * hardware commands. It is the single, protocol-agnostic seam: adding a new
 * device type means adding a Driver + a registry entry, nothing else.
 *
 * Robustness: each driver is isolated in try/catch, drivers never throw out of
 * `apply`, and a disabled master switch (or no devices) means no sockets at all
 * — the app falls back to pure on-screen simulation.
 */
export class HardwareManager {
  private config: HardwareConfig = { enabled: false, devices: [] };
  private drivers = new Map<string, Driver>();
  private lastRoom?: HardwareRoomState;
  private applyTimer?: NodeJS.Timeout;
  private statesCb?: (states: DeviceState[]) => void;

  setConfig(cfg: HardwareConfig) {
    this.config = cfg;
    // tear everything down and rebuild — config changes are infrequent and a
    // clean rebuild avoids fiddly per-field diffing of sockets.
    this.disposeDrivers();
    if (!cfg.enabled) {
      this.emitStates();
      return;
    }
    for (const dc of cfg.devices) {
      if (!dc.enabled) continue;
      const driver = this.makeDriver(dc);
      if (!driver) continue;
      driver.onStateChange(() => this.emitStates());
      this.drivers.set(dc.id, driver);
      driver.connect().catch(() => {
        /* driver reports its own error status */
      });
    }
    this.emitStates();
    if (this.lastRoom) this.applyState(this.lastRoom);
  }

  /** Coalesce rapid updates (slider storms) into a single trailing apply. */
  applyState(room: HardwareRoomState) {
    this.lastRoom = room;
    if (!this.config.enabled || this.drivers.size === 0) return;
    if (this.applyTimer) clearTimeout(this.applyTimer);
    this.applyTimer = setTimeout(() => {
      for (const driver of this.drivers.values()) {
        try {
          driver.apply(room);
        } catch {
          /* a single misbehaving device must not break the others */
        }
      }
    }, 50);
  }

  getDeviceStates(): DeviceState[] {
    return [...this.drivers.values()].map((d) => d.getState());
  }

  onDeviceStates(cb: (states: DeviceState[]) => void) {
    this.statesCb = cb;
  }

  dispose() {
    if (this.applyTimer) clearTimeout(this.applyTimer);
    this.disposeDrivers();
  }

  private makeDriver(dc: DeviceConfig): Driver | null {
    switch (dc.protocol) {
      case 'pjlink':
        return new PjLinkDriver(dc);
      case 'artnet':
        return new ArtNetDriver(dc);
      case 'osc':
        return new OscDriver(dc);
      default:
        return null;
    }
  }

  private disposeDrivers() {
    for (const driver of this.drivers.values()) {
      try {
        driver.dispose();
      } catch {
        /* ignore */
      }
    }
    this.drivers.clear();
  }

  private emitStates() {
    this.statesCb?.(this.getDeviceStates());
  }
}
