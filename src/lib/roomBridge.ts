import { useCallback, useEffect, useState } from 'react';
import { defaultRoomProfile, type DisplayInfo, type RoomProfile } from './room';

/**
 * Renderer access to the room profile (surfaces/displays). In a plain browser
 * (no Electron bridge) it resolves to a default profile with setupComplete
 * false, so the wizard runs in simulated mode and nothing crashes.
 */
export function useRoomProfile(): {
  profile: RoomProfile | null;
  save: (p: RoomProfile) => Promise<void>;
  reload: () => void;
} {
  const [profile, setProfile] = useState<RoomProfile | null>(null);

  const reload = useCallback(() => {
    const bridge = window.immerse?.room;
    if (bridge) bridge.getProfile().then(setProfile).catch(() => setProfile(defaultRoomProfile()));
    else setProfile(defaultRoomProfile());
  }, []);

  useEffect(reload, [reload]);

  const save = useCallback(async (p: RoomProfile) => {
    setProfile(p);
    await window.immerse?.room?.setProfile(p).catch(() => {});
  }, []);

  return { profile, save, reload };
}

export function useDisplays(): DisplayInfo[] {
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  useEffect(() => {
    window.immerse?.room?.listDisplays().then(setDisplays).catch(() => {});
  }, []);
  return displays;
}

export const isElectron = (): boolean => !!window.immerse;
