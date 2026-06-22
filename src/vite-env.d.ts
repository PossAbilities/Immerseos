/// <reference types="vite/client" />

import type {
  DeviceState,
  HardwareConfig,
  HardwareRoomState,
} from './lib/hardware';

interface ImmerseHardwareBridge {
  getConfig: () => Promise<HardwareConfig>;
  setConfig: (cfg: HardwareConfig) => Promise<void>;
  applyState: (room: HardwareRoomState) => Promise<void>;
  getDeviceStates: () => Promise<DeviceState[]>;
  onDeviceStates: (cb: (states: DeviceState[]) => void) => () => void;
}

interface ImmerseBridge {
  remoteUrl: () => Promise<string>;
  openProjection: () => Promise<void>;
  isElectron: boolean;
  hardware?: ImmerseHardwareBridge;
}

declare global {
  interface Window {
    immerse?: ImmerseBridge;
  }
}

export {};
