import dgram from 'node:dgram';
import { BaseSensorSource } from '../SensorSource.js';
import { isTuioCursorAddress, parseOscPacket } from '../tuio.js';
import type { SensorConfig } from '../types.js';

/**
 * Listens for TUIO 1.1 /tuio/2Dcur traffic over UDP and emits normalized touch
 * points. Phase (down/move/up) is derived by diffing each frame's `alive` set
 * against the previous frame. Works with laser/LiDAR curtains and camera
 * trackers (CCV etc.) — anything that speaks TUIO.
 */
export class TuioSource extends BaseSensorSource {
  private socket?: dgram.Socket;
  private prevAlive = new Set<number>();
  private positions = new Map<number, { x: number; y: number }>();
  private pointsWindow: number[] = [];
  private idleTimer?: NodeJS.Timeout;

  constructor(private cfg: SensorConfig) {
    super(cfg.id);
  }

  async start() {
    this.setStatus('listening');
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.socket = socket;
    socket.on('error', (e) => this.setStatus('error', { lastError: e.message }));
    socket.on('message', (msg) => this.handle(msg));
    socket.bind(this.cfg.port, this.cfg.bind ?? '0.0.0.0');
  }

  dispose() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.socket?.close();
    this.socket = undefined;
    this.setStatus('offline');
  }

  private markActive() {
    const now = Date.now();
    this.pointsWindow.push(now);
    this.pointsWindow = this.pointsWindow.filter((t) => now - t < 1000);
    this.setStatus('active', { lastPacketAt: now, pointsPerSec: this.pointsWindow.length });
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.setStatus('listening', { pointsPerSec: 0 }), 1500);
  }

  private handle(buf: Buffer) {
    const messages = parseOscPacket(buf);
    const sets = new Map<number, { x: number; y: number }>();
    let aliveNow: Set<number> | null = null;

    for (const m of messages) {
      if (!isTuioCursorAddress(m.address)) continue;
      const cmd = m.args[0];
      if (cmd === 'set' && typeof m.args[1] === 'number') {
        sets.set(m.args[1] as number, {
          x: m.args[2] as number,
          y: m.args[3] as number,
        });
      } else if (cmd === 'alive') {
        aliveNow = new Set(m.args.slice(1).map(Number));
      }
    }
    if (aliveNow === null && sets.size === 0) return;
    this.markActive();

    const now = Date.now();
    // position updates → down (new) or move (existing)
    for (const [sid, pos] of sets) {
      const phase = this.prevAlive.has(sid) ? 'move' : 'down';
      this.positions.set(sid, pos);
      this.emit({ sensorId: this.id, sessionId: sid, x: pos.x, y: pos.y, phase, t: now });
    }
    // removals → up, using the last known position
    if (aliveNow) {
      for (const sid of this.prevAlive) {
        if (!aliveNow.has(sid)) {
          const pos = this.positions.get(sid) ?? { x: 0, y: 0 };
          this.emit({ sensorId: this.id, sessionId: sid, x: pos.x, y: pos.y, phase: 'up', t: now });
          this.positions.delete(sid);
        }
      }
      this.prevAlive = aliveNow;
    }
  }
}
