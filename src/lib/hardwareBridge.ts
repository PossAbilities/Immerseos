// Control-surface glue between the synced room state and the Electron hardware
// layer. Runs only in the control window (the single authority that commands
// hardware) and only inside Electron — in a plain browser every call no-ops, so
// the on-screen simulation is unaffected.

import { useEffect, useState } from 'react';
import { useStore, type AppState } from '@/store/useStore';
import type { DeviceState, HardwareRoomState } from '@/lib/hardware';

function selectHardwareRoom(s: AppState): HardwareRoomState {
  return {
    live: s.live,
    playing: s.playing,
    volume: s.volume,
    muted: s.muted,
    lighting: s.lighting,
    lightIntensity: s.lightIntensity,
    tintHue: s.params.hue,
  };
}

/**
 * Subscribe the hardware layer to room-state changes. Returns an unsubscribe.
 * Because the control window receives every patch from the projection and phone
 * remotes through the sync mesh, any change made anywhere flows here and is
 * pushed to the devices.
 */
export function startHardwareBridge(): () => void {
  const bridge = window.immerse?.hardware;
  if (!bridge) return () => {};

  let last = '';
  const push = (s: AppState) => {
    const room = selectHardwareRoom(s);
    const key = JSON.stringify(room);
    if (key === last) return; // only push on a meaningful change
    last = key;
    bridge.applyState(room).catch(() => {});
  };

  push(useStore.getState());
  return useStore.subscribe(push);
}

/** Live device status for the Settings panel. */
export function useDeviceStates(): DeviceState[] {
  const [states, setStates] = useState<DeviceState[]>([]);
  useEffect(() => {
    const bridge = window.immerse?.hardware;
    if (!bridge) return;
    bridge.getDeviceStates().then(setStates).catch(() => {});
    return bridge.onDeviceStates(setStates);
  }, []);
  return states;
}

export interface HardwareDevice {
  id: string;
  name: string;
  kind: string;
  status: DeviceState['status'];
  lastError?: string;
}

/**
 * Configured devices merged with their live status, for the Theater Control
 * hardware panel. Returns `null` when no hardware bridge / no devices are
 * present so the caller can fall back to the on-screen simulation list.
 */
export function useHardwareDevices(): HardwareDevice[] | null {
  const states = useDeviceStates();
  const [names, setNames] = useState<Record<string, { name: string; kind: string }>>({});

  useEffect(() => {
    const bridge = window.immerse?.hardware;
    if (!bridge) return;
    bridge
      .getConfig()
      .then((cfg) =>
        setNames(
          Object.fromEntries(cfg.devices.map((d) => [d.id, { name: d.name, kind: d.kind }])),
        ),
      )
      .catch(() => {});
  }, []);

  if (!window.immerse?.hardware || states.length === 0) return null;
  return states.map((s) => ({
    id: s.id,
    name: names[s.id]?.name ?? 'Device',
    kind: names[s.id]?.kind ?? 'device',
    status: s.status,
    lastError: s.lastError,
  }));
}
