import { useEffect, useState } from 'react';
import { broadcastTouch } from '@/store/useStore';
import { emitSurfaceTouch } from './touchBus';
import type { SensorState } from './sensors';

/**
 * Bridges hardware touch events from Electron into the renderer touch bus, and
 * fans them out to the other surfaces. Control-surface only; no-op in browser.
 */
export function startTouchBridge(): () => void {
  const bridge = window.immerse?.sensors;
  if (!bridge) return () => {};
  return bridge.onTouch((t) => {
    emitSurfaceTouch(t); // local listeners (e.g. the wizard Test step)
    broadcastTouch(t); // projection / remote
  });
}

/** Live sensor status for the wizard / settings. */
export function useSensorStates(): SensorState[] {
  const [states, setStates] = useState<SensorState[]>([]);
  useEffect(() => {
    const bridge = window.immerse?.sensors;
    if (!bridge) return;
    bridge.getStates().then(setStates).catch(() => {});
    return bridge.onStates(setStates);
  }, []);
  return states;
}
