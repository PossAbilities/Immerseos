/// <reference types="vite/client" />

import type {
  DeviceConfig,
  DeviceState,
  DiscoveredDevice,
  HardwareConfig,
  HardwareRoomState,
  TestResult,
} from './lib/hardware';
import type { DisplayInfo, RoomProfile, SurfaceId } from './lib/room';
import type {
  CalibrationProgress,
  CaptureResult,
  DiscoveredSensor,
  SensorState,
  SensorsConfig,
  SurfaceTouch,
} from './lib/sensors';

interface ImmerseHardwareBridge {
  getConfig: () => Promise<HardwareConfig>;
  setConfig: (cfg: HardwareConfig) => Promise<void>;
  applyState: (room: HardwareRoomState) => Promise<void>;
  getDeviceStates: () => Promise<DeviceState[]>;
  testDevice: (cfg: DeviceConfig) => Promise<TestResult>;
  discover: (kind: 'projector' | 'lighting') => Promise<DiscoveredDevice[]>;
  onDeviceStates: (cb: (states: DeviceState[]) => void) => () => void;
}

interface ImmerseRoomBridge {
  getProfile: () => Promise<RoomProfile>;
  setProfile: (p: RoomProfile) => Promise<void>;
  listDisplays: () => Promise<DisplayInfo[]>;
  openProjections: () => Promise<void>;
}

interface ImmerseSensorBridge {
  getConfig: () => Promise<SensorsConfig>;
  setConfig: (c: SensorsConfig) => Promise<void>;
  getStates: () => Promise<SensorState[]>;
  detect: () => Promise<DiscoveredSensor[]>;
  beginCalibration: (surfaceId: SurfaceId) => Promise<CaptureResult>;
  cancelCalibration: () => Promise<void>;
  onStates: (cb: (s: SensorState[]) => void) => () => void;
  onCalibrationProgress: (cb: (p: CalibrationProgress) => void) => () => void;
  onTouch: (cb: (t: SurfaceTouch) => void) => () => void;
}

interface ImmerseBridge {
  remoteUrl: () => Promise<string>;
  openProjection: () => Promise<void>;
  isElectron: boolean;
  hardware?: ImmerseHardwareBridge;
  room?: ImmerseRoomBridge;
  sensors?: ImmerseSensorBridge;
}

declare global {
  interface Window {
    immerse?: ImmerseBridge;
  }
}

export {};
