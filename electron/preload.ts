import { contextBridge, ipcRenderer } from 'electron';

// Minimal, safe bridge surfaced to the renderer as `window.immerse`.
contextBridge.exposeInMainWorld('immerse', {
  /** URL a phone should open to reach the room remote (LAN address). */
  remoteUrl: (): Promise<string> => ipcRenderer.invoke('remote-url'),
  /** Open / focus the full-screen projection window on the second display. */
  openProjection: (): Promise<void> => ipcRenderer.invoke('open-projection'),
  isElectron: true,
});
