import { app } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defaultRoomProfile, type RoomProfile } from './types.js';

function configPath(): string {
  return path.join(app.getPath('userData'), 'room.json');
}

export function loadRoomProfile(): RoomProfile {
  try {
    const parsed = JSON.parse(readFileSync(configPath(), 'utf8')) as RoomProfile;
    if (!parsed || !Array.isArray(parsed.surfaces)) return defaultRoomProfile();
    return parsed;
  } catch {
    return defaultRoomProfile();
  }
}

export function saveRoomProfile(profile: RoomProfile) {
  try {
    writeFileSync(configPath(), JSON.stringify(profile, null, 2), 'utf8');
  } catch (e) {
    console.error('[immerseos] failed to save room profile', e);
  }
}
