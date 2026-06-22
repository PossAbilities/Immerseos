import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { remoteUrl, startServer, stopServer } from './server.js';
import { HardwareManager } from './hardware/HardwareManager.js';
import { loadConfig, saveConfig } from './hardware/configStore.js';
import { discover, testDevice } from './hardware/discovery.js';
import type { DeviceConfig, HardwareConfig, HardwareRoomState } from './hardware/types.js';
import { SensorManager } from './sensors/SensorManager.js';
import { CalibrationService } from './sensors/CalibrationService.js';
import { TouchRouter } from './sensors/router.js';
import { detectSensors } from './sensors/detect.js';
import { loadSensorsConfig, saveSensorsConfig } from './sensors/configStore.js';
import type { SensorsConfig } from './sensors/types.js';
import { loadRoomProfile, saveRoomProfile } from './room/configStore.js';
import { listDisplays } from './room/displays.js';
import type { RoomProfile, SurfaceId } from './room/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '../dist');
const DEV_URL = process.env.VITE_DEV_SERVER_URL;

let control: BrowserWindow | null = null;
const surfaceWindows = new Map<string, BrowserWindow>(); // key: surfaceId, or '*' for the default single output

const hardware = new HardwareManager();
const sensors = new SensorManager();
const router = new TouchRouter();
const calibration = new CalibrationService(sensors, (p) =>
  control?.webContents.send('calibration:progress', p),
);

function load(win: BrowserWindow, route: 'index' | 'projection', hash = '') {
  const suffix = hash ? `#${hash}` : '';
  if (DEV_URL) {
    win.loadURL(`${DEV_URL}/${route}.html${suffix}`);
  } else {
    win.loadFile(path.join(DIST, `${route}.html`), hash ? { hash } : undefined);
  }
}

function createControlWindow() {
  control = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#0F1115',
    title: 'ImmerseOS',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  load(control, 'index');
  control.on('closed', () => {
    control = null;
    for (const w of surfaceWindows.values()) w.close();
  });
}

function makeProjectionWindow(
  key: string,
  bounds: { x: number; y: number; width: number; height: number },
  fullscreen: boolean,
  hash: string,
) {
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    fullscreen,
    frame: !fullscreen,
    backgroundColor: '#000000',
    title: 'ImmerseOS · Projection',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  load(win, 'projection', hash);
  win.on('closed', () => surfaceWindows.delete(key));
  surfaceWindows.set(key, win);
}

/**
 * Open the projection output(s). If surfaces have been assigned to specific
 * displays in the room profile, open one full-screen window per assigned
 * display targeting that wall; otherwise fall back to a single output on the
 * second display (or primary).
 */
function openProjections() {
  const profile = loadRoomProfile();
  const displays = screen.getAllDisplays();
  const assigned = profile.surfaces.filter((s) => s.enabled && s.displayId != null);

  if (assigned.length > 0) {
    const usedDisplays = new Set<number>();
    for (const surface of assigned) {
      // one physical display drives one surface — ignore duplicate assignments
      // rather than stacking two full-screen windows on the same projector.
      if (surface.displayId != null && usedDisplays.has(surface.displayId)) continue;
      if (surface.displayId != null) usedDisplays.add(surface.displayId);

      const key = String(surface.id);
      const existing = surfaceWindows.get(key);
      if (existing) {
        existing.focus();
        continue;
      }
      const display = displays.find((d) => d.id === surface.displayId) ?? screen.getPrimaryDisplay();
      makeProjectionWindow(key, display.bounds, true, `surface=${surface.id}`);
    }
    return;
  }

  // legacy single-output behaviour
  if (surfaceWindows.has('*')) {
    surfaceWindows.get('*')!.focus();
    return;
  }
  const external = displays.find((d) => d.bounds.x !== 0 || d.bounds.y !== 0);
  const target = external ?? screen.getPrimaryDisplay();
  makeProjectionWindow('*', target.bounds, !!external, '');
}

app.whenReady().then(() => {
  startServer(DIST);
  createControlWindow();
  openProjections();

  // bring up configured room hardware (projectors / lighting / audio)
  hardware.setConfig(loadConfig());
  hardware.onDeviceStates((states) => control?.webContents.send('hardware:states', states));

  // bring up sensors and route their touches onto calibrated surfaces
  router.setProfile(loadRoomProfile());
  sensors.setConfig(loadSensorsConfig());
  sensors.onSensorStates((states) => control?.webContents.send('sensors:states', states));
  sensors.onTouch((raw) => {
    const surfaceTouch = router.route(raw);
    if (surfaceTouch) control?.webContents.send('sensors:touch', surfaceTouch);
  });

  ipcMain.handle('remote-url', () => remoteUrl());
  ipcMain.handle('open-projection', () => openProjections());

  // --- hardware control bridge (renderer → main) ---
  ipcMain.handle('hardware:get-config', () => loadConfig());
  ipcMain.handle('hardware:set-config', (_e, cfg: HardwareConfig) => {
    saveConfig(cfg);
    hardware.setConfig(cfg);
  });
  ipcMain.handle('hardware:apply-state', (_e, room: HardwareRoomState) =>
    hardware.applyState(room),
  );
  ipcMain.handle('hardware:get-states', () => hardware.getDeviceStates());
  ipcMain.handle('hardware:test-device', (_e, cfg: DeviceConfig) => testDevice(cfg));
  ipcMain.handle('hardware:discover', (_e, kind: 'projector' | 'lighting') => discover(kind));

  // --- room profile (surfaces, displays) ---
  ipcMain.handle('room:get-profile', () => loadRoomProfile());
  ipcMain.handle('room:set-profile', (_e, profile: RoomProfile) => {
    saveRoomProfile(profile);
    router.setProfile(profile);
  });
  ipcMain.handle('room:list-displays', () => listDisplays());
  ipcMain.handle('room:open-projections', () => openProjections());

  // --- sensors / touch calibration ---
  ipcMain.handle('sensors:get-config', () => loadSensorsConfig());
  ipcMain.handle('sensors:set-config', (_e, cfg: SensorsConfig) => {
    saveSensorsConfig(cfg);
    sensors.setConfig(cfg);
  });
  ipcMain.handle('sensors:get-states', () => sensors.getStates());
  ipcMain.handle('sensors:detect', () => detectSensors());
  ipcMain.handle('sensors:begin-calibration', (_e, surfaceId: SurfaceId) =>
    calibration.begin(surfaceId),
  );
  ipcMain.handle('sensors:cancel-calibration', () => calibration.cancel());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createControlWindow();
  });
});

app.on('window-all-closed', () => {
  hardware.dispose();
  sensors.dispose();
  stopServer();
  if (process.platform !== 'darwin') app.quit();
});
