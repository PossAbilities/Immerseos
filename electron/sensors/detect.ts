import dgram from 'node:dgram';
import { looksLikeTuio, parseOscPacket } from './tuio.js';
import type { DiscoveredSensor } from './types.js';

const DEFAULT_TUIO_PORT = 3333;
const WINDOW_MS = 3500;

/**
 * Passive sensor detection for the setup wizard: listen briefly for any TUIO
 * traffic and report the active sources seen. The operator powers on the laser
 * curtain / camera tracker and the wizard says "I can see touch input from X".
 *
 * Binds with reuseAddr so it can co-exist with a live source where the OS
 * allows; if the port can't be bound it resolves empty (the wizard then offers
 * a manual add). Best-effort by design.
 */
export function detectSensors(port = DEFAULT_TUIO_PORT): Promise<DiscoveredSensor[]> {
  return new Promise((resolve) => {
    const found = new Map<string, DiscoveredSensor>();
    let socket: dgram.Socket;
    try {
      socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    } catch {
      return resolve([]);
    }
    const finish = () => {
      try {
        socket.close();
      } catch {
        /* already closed */
      }
      resolve([...found.values()]);
    };
    socket.on('error', finish);
    socket.on('message', (msg, rinfo) => {
      const messages = parseOscPacket(msg);
      if (!messages.some((m) => looksLikeTuio(m.address))) return;
      const key = rinfo.address;
      const existing = found.get(key);
      if (existing) existing.packetCount++;
      else found.set(key, { host: key, port, protocol: 'tuio', packetCount: 1 });
    });
    try {
      socket.bind(port, '0.0.0.0');
    } catch {
      return resolve([]);
    }
    setTimeout(finish, WINDOW_MS);
  });
}
