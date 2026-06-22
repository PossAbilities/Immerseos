import { contextBridge, ipcRenderer } from 'electron';
import type {
  DeviceConfig,
  DeviceState,
  DiscoveredDevice,
  HardwareConfig,
  HardwareRoomState,
  TestResult,
} from './hardware/types.js';
import type { DisplayInfo, RoomProfile, SurfaceId } from './room/types.js';
import type {
  CalibrationProgress,
  CaptureResult,
  DiscoveredSensor,
  SensorState,
  SensorsConfig,
  SurfaceTouch,
} from './sensors/types.js';

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

  /** Room geometry: surfaces, display assignment, projection windows. */
  room: {
    getProfile: (): Promise<RoomProfile> => ipcRenderer.invoke('room:get-profile'),
    setProfile: (p: RoomProfile): Promise<void> => ipcRenderer.invoke('room:set-profile', p),
    listDisplays: (): Promise<DisplayInfo[]> => ipcRenderer.invoke('room:list-displays'),
    openProjections: (): Promise<void> => ipcRenderer.invoke('room:open-projections'),
  },

  /** Touch sensors (laser/LiDAR, camera trackers) and calibration. */
  sensors: {
    getConfig: (): Promise<SensorsConfig> => ipcRenderer.invoke('sensors:get-config'),
    setConfig: (c: SensorsConfig): Promise<void> => ipcRenderer.invoke('sensors:set-config', c),
    getStates: (): Promise<SensorState[]> => ipcRenderer.invoke('sensors:get-states'),
    detect: (): Promise<DiscoveredSensor[]> => ipcRenderer.invoke('sensors:detect'),
    beginCalibration: (surfaceId: SurfaceId): Promise<CaptureResult> =>
      ipcRenderer.invoke('sensors:begin-calibration', surfaceId),
    cancelCalibration: (): Promise<void> => ipcRenderer.invoke('sensors:cancel-calibration'),
    onStates: (cb: (s: SensorState[]) => void): (() => void) => {
      const handler = (_e: unknown, s: SensorState[]) => cb(s);
      ipcRenderer.on('sensors:states', handler);
      return () => ipcRenderer.removeListener('sensors:states', handler);
    },
    onCalibrationProgress: (cb: (p: CalibrationProgress) => void): (() => void) => {
      const handler = (_e: unknown, p: CalibrationProgress) => cb(p);
      ipcRenderer.on('calibration:progress', handler);
      return () => ipcRenderer.removeListener('calibration:progress', handler);
    },
    onTouch: (cb: (t: SurfaceTouch) => void): (() => void) => {
      const handler = (_e: unknown, t: SurfaceTouch) => cb(t);
      ipcRenderer.on('sensors:touch', handler);
      return () => ipcRenderer.removeListener('sensors:touch', handler);
    },
  },
});
