import { BaseDriver } from '../Driver.js';
import { pjlinkCommand } from '../pjlink.js';
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
    // forget any cached desired-state so the first apply after we're online
    // actually transmits (rather than being de-duped away).
    this.lastPower = undefined;
    this.lastShutter = undefined;
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
        .catch((e) => {
          this.lastPower = undefined; // failed → allow a retry next apply
          this.setStatus('error', errMsg(e));
        });
    }
    if (shutter !== this.lastShutter) {
      this.lastShutter = shutter;
      // AVMT 31 = mute on (shutter closed), 30 = mute off
      this.command(`%1AVMT ${shutter ? '31' : '30'}`).catch((e) => {
        this.lastShutter = undefined; // failed → allow a retry next apply
        this.setStatus('error', errMsg(e));
      });
    }
  }

  dispose() {
    if (this.poll) clearInterval(this.poll);
    this.setStatus('offline');
  }

  private command(cmd: string): Promise<string> {
    return pjlinkCommand({
      host: this.cfg.host,
      port: this.cfg.port,
      password: this.cfg.password,
      command: cmd,
    });
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
