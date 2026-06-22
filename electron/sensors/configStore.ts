import { app } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defaultSensorsConfig, type SensorsConfig } from './types.js';

function configPath(): string {
  return path.join(app.getPath('userData'), 'sensors.json');
}

export function loadSensorsConfig(): SensorsConfig {
  try {
    const parsed = JSON.parse(readFileSync(configPath(), 'utf8')) as SensorsConfig;
    if (!parsed || !Array.isArray(parsed.sensors)) return defaultSensorsConfig();
    return parsed;
  } catch {
    return defaultSensorsConfig();
  }
}

export function saveSensorsConfig(cfg: SensorsConfig) {
  try {
    writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {
    console.error('[immerseos] failed to save sensors config', e);
  }
}
