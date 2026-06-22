/// <reference types="vite/client" />

interface ImmerseBridge {
  remoteUrl: () => Promise<string>;
  openProjection: () => Promise<void>;
  isElectron: boolean;
}

interface Window {
  immerse?: ImmerseBridge;
}
