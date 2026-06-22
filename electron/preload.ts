import { contextBridge, ipcRenderer } from 'electron';
import type {
  DeviceConfig,
  DeviceState,
  DiscoveredDevice,
  HardwareConfig,
  HardwareRoomState,
  TestResult,
} from './hardware/types.js';

// Minimal, safe bridge surfaced to the renderer as `window.immerse`.
contextBridge.exposeInMainWorld('immerse', {
  /** URL a phone should open to reach the room remote (LAN address). */
  remoteUrl: (): Promise<string> => ipcRenderer.invoke('remote-url'),
  /** Open / focus the full-screen projection window on the second display. */
  openProjection: (): Promise<void> => ipcRenderer.invoke('open-projection'),
  isElectron: true,

  /** Real room-hardware control (projectors / lighting / audio). */
  hardware: {
    getConfig: (): Promise<HardwareConfig> => ipcRenderer.invoke('hardware:get-config'),
    setConfig: (cfg: HardwareConfig): Promise<void> =>
      ipcRenderer.invoke('hardware:set-config', cfg),
    applyState: (room: HardwareRoomState): Promise<void> =>
      ipcRenderer.invoke('hardware:apply-state', room),
    getDeviceStates: (): Promise<DeviceState[]> =>
      ipcRenderer.invoke('hardware:get-states'),
    testDevice: (cfg: DeviceConfig): Promise<TestResult> =>
      ipcRenderer.invoke('hardware:test-device', cfg),
    discover: (kind: 'projector' | 'lighting'): Promise<DiscoveredDevice[]> =>
      ipcRenderer.invoke('hardware:discover', kind),
    onDeviceStates: (cb: (states: DeviceState[]) => void): (() => void) => {
      const handler = (_e: unknown, states: DeviceState[]) => cb(states);
      ipcRenderer.on('hardware:states', handler);
      return () => ipcRenderer.removeListener('hardware:states', handler);
    },
  },
});
