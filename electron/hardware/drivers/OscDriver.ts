import dgram from 'node:dgram';
import { BaseDriver } from '../Driver.js';
import type { AudioConfig, HardwareRoomState } from '../types.js';

/**
 * Spatial-audio / mixer control over OSC (UDP). Sends the master volume as a
 * normalised float (0..1) and an optional mute flag. OSC is the generic,
 * widely-supported control standard for audio matrices, DAWs and media servers.
 */
export class OscDriver extends BaseDriver {
  readonly kind = 'audio' as const;
  private socket?: dgram.Socket;
  private lastVolume = -1;
  private lastMute?: boolean;

  constructor(private cfg: AudioConfig) {
    super(cfg.id);
  }

  async connect() {
    this.setStatus('connecting');
    // forget cached values so the first apply after binding actually transmits
    this.lastVolume = -1;
    this.lastMute = undefined;
    this.socket = dgram.createSocket('udp4');
    this.socket.on('error', (e) => this.setStatus('error', e.message));
    this.socket.bind(() => this.setStatus('online'));
  }

  apply(state: HardwareRoomState) {
    const vol = Math.max(0, Math.min(1, state.volume / 100));
    if (vol !== this.lastVolume) {
      this.lastVolume = vol;
      this.sendFloat(this.cfg.volumeAddress, vol);
    }
    if (this.cfg.muteAddress && state.muted !== this.lastMute) {
      this.lastMute = state.muted;
      this.sendInt(this.cfg.muteAddress, state.muted ? 1 : 0);
    }
  }

  dispose() {
    this.socket?.close();
    this.socket = undefined;
    this.setStatus('offline');
  }

  private sendFloat(address: string, value: number) {
    const f = Buffer.alloc(4);
    f.writeFloatBE(value, 0);
    this.send(address, ',f', f);
  }

  private sendInt(address: string, value: number) {
    const i = Buffer.alloc(4);
    i.writeInt32BE(value, 0);
    this.send(address, ',i', i);
  }

  private send(address: string, typeTag: string, arg: Buffer) {
    if (!this.socket) return;
    const packet = Buffer.concat([oscString(address), oscString(typeTag), arg]);
    this.socket.send(packet, this.cfg.port, this.cfg.host, (e) => {
      if (e) this.setStatus('error', e.message);
    });
  }
}

/** OSC strings are null-terminated and padded to a multiple of 4 bytes. */
function oscString(s: string): Buffer {
  const raw = Buffer.from(s, 'ascii');
  const padded = Buffer.alloc(Math.ceil((raw.length + 1) / 4) * 4);
  raw.copy(padded);
  return padded;
}
