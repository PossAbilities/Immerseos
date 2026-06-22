import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { remoteUrl, startServer, stopServer } from './server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '../dist');
const DEV_URL = process.env.VITE_DEV_SERVER_URL;

let control: BrowserWindow | null = null;
let projection: BrowserWindow | null = null;

function load(win: BrowserWindow, route: 'index' | 'projection') {
  if (DEV_URL) {
    win.loadURL(`${DEV_URL}/${route}.html`);
  } else {
    win.loadFile(path.join(DIST, `${route}.html`));
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
    projection?.close();
  });
}

/** Open the projection output, preferring a second physical display. */
function createProjectionWindow() {
  if (projection) {
    projection.focus();
    return;
  }
  const displays = screen.getAllDisplays();
  const external = displays.find((d) => d.bounds.x !== 0 || d.bounds.y !== 0);
  const target = external ?? screen.getPrimaryDisplay();

  projection = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    fullscreen: !!external,
    frame: !external,
    backgroundColor: '#000000',
    title: 'ImmerseOS · Projection',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  load(projection, 'projection');
  projection.on('closed', () => {
    projection = null;
  });
}

app.whenReady().then(() => {
  startServer(DIST);
  createControlWindow();
  createProjectionWindow();

  ipcMain.handle('remote-url', () => remoteUrl());
  ipcMain.handle('open-projection', () => createProjectionWindow());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createControlWindow();
  });
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') app.quit();
});
