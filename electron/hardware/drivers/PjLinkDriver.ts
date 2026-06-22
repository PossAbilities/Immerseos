import net from 'node:net';
import { createHash } from 'node:crypto';
import { BaseDriver } from '../Driver.js';
import type { HardwareRoomState, ProjectorConfig } from '../types.js';

/**
 * PJLink Class 1 projector control over TCP (default port 4352). PJLink is the
 * cross-vendor standard supported by Epson, Panasonic, NEC, Christie, etc.
 *
 * Each command is a short connection: the projector greets with
 * `PJLINK 0` (no auth) or `PJLINK 1 <seed>` (auth → prefix commands with
 * md5(seed + password)). We map room state to power + shutter (A/V mute).
 */
export class PjLinkDriver extends BaseDriver {
  readonly kind = 'projector' as const;
  private poll?: NodeJS.Timeout;
  private lastPower?: boolean;
  private lastShutter?: boolean;

  constructor(private cfg: ProjectorConfig) {
    super(cfg.id);
  }

  async connect() {
    this.setStatus('connecting');
    try {
      await this.command('%1POWR ?'); // reachability check
      this.setStatus('online');
    } catch (e) {
      this.setStatus('error', errMsg(e));
    }
    // light keep-alive / status poll
    this.poll = setInterval(() => {
      this.command('%1POWR ?')
        .then(() => this.setStatus('online'))
        .catch((e) => this.setStatus('error', errMsg(e)));
    }, 10_000);
  }

  apply(state: HardwareRoomState) {
    const power = state.live;
    // close the shutter when not live, or when paused on a blackout cue
    const shutter = !state.live || state.lighting === 'blackout';

    if (power !== this.lastPower) {
      this.lastPower = power;
      this.command(`%1POWR ${power ? '1' : '0'}`)
        .then(() => {
          if (power && this.cfg.inputOnLive) {
            return this.command(`%1INPT ${this.cfg.inputOnLive}`);
          }
        })
        .catch((e) => this.setStatus('error', errMsg(e)));
    }
    if (shutter !== this.lastShutter) {
      this.lastShutter = shutter;
      // AVMT 31 = mute on (shutter closed), 30 = mute off
      this.command(`%1AVMT ${shutter ? '31' : '30'}`).catch((e) =>
        this.setStatus('error', errMsg(e)),
      );
    }
  }

  dispose() {
    if (this.poll) clearInterval(this.poll);
    this.setStatus('offline');
  }

  /** Open a connection, perform the (optional) digest handshake, send one command. */
  private command(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.cfg.host, port: this.cfg.port });
      let greeted = false;
      let buf = '';
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('PJLink timeout'));
      }, 4000);

      const done = (fn: () => void) => {
        clearTimeout(timer);
        socket.destroy();
        fn();
      };

      socket.on('data', (chunk) => {
        buf += chunk.toString('ascii');
        if (!greeted && buf.includes('\r')) {
          greeted = true;
          const greeting = buf.split('\r')[0];
          buf = '';
          let prefix = '';
          if (greeting.startsWith('PJLINK 1')) {
            const seed = greeting.split(' ')[2] ?? '';
            prefix = createHash('md5')
              .update(seed + (this.cfg.password ?? ''))
              .digest('hex');
          } else if (greeting.startsWith('PJLINK ERRA')) {
            return done(() => reject(new Error('PJLink auth error')));
          }
          socket.write(prefix + cmd + '\r');
          return;
        }
        if (greeted && buf.includes('\r')) {
          const reply = buf.split('\r')[0];
          done(() => resolve(reply));
        }
      });
      socket.on('error', (e) => done(() => reject(e)));
    });
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
