import { app } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { HardwareConfig } from './types.js';

// Hardware config is owned by the main process (it needs it at startup, before
// any window opens), persisted as JSON in the app's userData directory.

const DEFAULT: HardwareConfig = { enabled: false, devices: [] };

function configPath(): string {
  return path.join(app.getPath('userData'), 'hardware.json');
}

export function loadConfig(): HardwareConfig {
  try {
    const raw = readFileSync(configPath(), 'utf8');
    const parsed = JSON.parse(raw) as HardwareConfig;
    if (!parsed || !Array.isArray(parsed.devices)) return DEFAULT;
    return parsed;
  } catch {
    return DEFAULT; // missing or corrupt → safe default (simulation)
  }
}

export function saveConfig(cfg: HardwareConfig) {
  try {
    writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {
    console.error('[immerseos] failed to save hardware config', e);
  }
}
