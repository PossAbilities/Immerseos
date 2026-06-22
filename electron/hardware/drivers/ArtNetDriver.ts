import dgram from 'node:dgram';
import { BaseDriver } from '../Driver.js';
import type { HardwareRoomState, LightingConfig } from '../types.js';

/**
 * DMX512 lighting over Art-Net (UDP, default port 6454). Builds the ArtDMX
 * packet by hand and keeps a 512-channel frame buffer. The room's lighting
 * preset + intensity (+ tint hue for the accent wash) is mapped onto the
 * configured dimmer/RGB channels. Frames are resent at a low refresh rate so
 * fixtures that expect continuous Art-Net don't time out.
 */
export class ArtNetDriver extends BaseDriver {
  readonly kind = 'lighting' as const;
  private socket?: dgram.Socket;
  private frame = new Uint8Array(512);
  private seq = 0;
  private refresh?: NodeJS.Timeout;
  private lastKey = '';

  constructor(private cfg: LightingConfig) {
    super(cfg.id);
  }

  async connect() {
    this.setStatus('connecting');
    this.socket = dgram.createSocket('udp4');
    this.socket.on('error', (e) => this.setStatus('error', e.message));
    this.socket.bind(() => {
      try {
        this.socket?.setBroadcast(true);
      } catch {
        /* broadcast not permitted on this host — unicast still works */
      }
      this.setStatus('online');
      this.send(); // push an initial frame
    });
    // continuous refresh keeps fixtures alive
    this.refresh = setInterval(() => this.send(), 1500);
  }

  apply(state: HardwareRoomState) {
    const preset = this.cfg.presets[state.lighting];
    if (!preset) return;
    const scale = Math.max(0, Math.min(1, state.lightIntensity / 100));
    const master = Math.round(preset.master * scale);

    let { r, g, b } = preset;
    if (state.lighting === 'accent') {
      // fold the active scene's hue into the accent wash
      [r, g, b] = hueToRgb(state.tintHue);
      r = Math.round(r * scale);
      g = Math.round(g * scale);
      b = Math.round(b * scale);
    }

    const ch = this.cfg.channels;
    if (ch.master) this.setCh(ch.master, master);
    if (ch.red) this.setCh(ch.red, r);
    if (ch.green) this.setCh(ch.green, g);
    if (ch.blue) this.setCh(ch.blue, b);

    const key = this.frame.join(',');
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.send();
    }
  }

  dispose() {
    if (this.refresh) clearInterval(this.refresh);
    this.socket?.close();
    this.socket = undefined;
    this.setStatus('offline');
  }

  private setCh(channel1Based: number, value: number) {
    const i = channel1Based - 1;
    if (i >= 0 && i < 512) this.frame[i] = clamp8(value);
  }

  private send() {
    if (!this.socket) return;
    const packet = this.buildArtDmx();
    this.socket.send(packet, this.cfg.port, this.cfg.host, (e) => {
      if (e) this.setStatus('error', e.message);
    });
  }

  private buildArtDmx(): Buffer {
    const len = 512;
    const header = Buffer.alloc(18);
    header.write('Art-Net\0', 0, 'ascii');
    header.writeUInt16LE(0x5000, 8); // OpOutput / ArtDMX
    header.writeUInt16BE(14, 10); // protocol version
    header.writeUInt8(this.seq = (this.seq + 1) & 0xff, 12);
    header.writeUInt8(0, 13); // physical
    header.writeUInt16LE(this.cfg.universe & 0x7fff, 14);
    header.writeUInt16BE(len, 16); // data length
    return Buffer.concat([header, Buffer.from(this.frame)]);
  }
}

function clamp8(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/** Convert a 0..1 hue (full saturation/value) to an [r,g,b] 0..255 triple. */
function hueToRgb(h: number): [number, number, number] {
  const x = (1 - Math.abs(((h * 6) % 2) - 1)) * 255;
  const c = 255;
  const seg = Math.floor(h * 6) % 6;
  const table: [number, number, number][] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  return table[seg < 0 ? seg + 6 : seg];
}
