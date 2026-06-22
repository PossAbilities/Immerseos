import dgram from 'node:dgram';
import net from 'node:net';
import { pjlinkCommand } from './pjlink.js';
import { getLanIp } from '../server.js';
import type { DeviceConfig, DiscoveredDevice, TestResult } from './types.js';

const ARTNET_PORT = 6454;

// ---------------------------------------------------------------------------
// Test connection — a one-shot probe used by the Settings "Test" button.
// ---------------------------------------------------------------------------

export async function testDevice(cfg: DeviceConfig): Promise<TestResult> {
  try {
    if (cfg.kind === 'projector') {
      const reply = await pjlinkCommand({
        host: cfg.host,
        port: cfg.port,
        password: cfg.password,
        command: '%1POWR ?',
        timeoutMs: 3000,
      });
      const power = reply.endsWith('1') ? 'powered on' : 'in standby';
      return { ok: true, message: `Projector responded (${power}).` };
    }

    if (cfg.kind === 'lighting') {
      const reply = await artPollOne(cfg.host);
      return reply
        ? { ok: true, message: `Art-Net node replied${reply.name ? `: ${reply.name}` : ''}.` }
        : {
            ok: false,
            message: 'No ArtPollReply (some DMX nodes don’t reply — check the fixture is lit when live).',
          };
    }

    // audio / OSC is connectionless — we can only confirm the packet left
    await sendOscProbe(cfg.host, cfg.port, cfg.volumeAddress);
    return { ok: true, message: 'OSC probe sent (connectionless — no acknowledgement).' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export async function discover(kind: 'projector' | 'lighting'): Promise<DiscoveredDevice[]> {
  return kind === 'lighting' ? discoverArtNet() : discoverPjLink();
}

/** Broadcast an ArtPoll and collect ArtPollReply packets for ~2s. */
function discoverArtNet(): Promise<DiscoveredDevice[]> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const found = new Map<string, DiscoveredDevice>();
    socket.on('error', () => {
      try {
        socket.close();
      } catch {
        /* already closed */
      }
      resolve([...found.values()]);
    });
    socket.on('message', (msg, rinfo) => {
      const reply = parseArtPollReply(msg, rinfo.address);
      if (reply) found.set(reply.host, reply);
    });
    socket.bind(() => {
      try {
        socket.setBroadcast(true);
      } catch {
        /* broadcast not permitted; replies on this subnet may still arrive */
      }
      socket.send(buildArtPoll(), ARTNET_PORT, '255.255.255.255');
    });
    setTimeout(() => {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      resolve([...found.values()]);
    }, 2000);
  });
}

/** Scan the local /24 on the PJLink port (4352) for projectors that greet us. */
async function discoverPjLink(): Promise<DiscoveredDevice[]> {
  const ip = getLanIp();
  if (ip === 'localhost') return [];
  const prefix = ip.split('.').slice(0, 3).join('.');
  const hosts = Array.from({ length: 254 }, (_, i) => `${prefix}.${i + 1}`);
  const found: DiscoveredDevice[] = [];

  // bounded concurrency so we don't open 254 sockets at once
  const POOL = 40;
  let idx = 0;
  async function worker() {
    while (idx < hosts.length) {
      const host = hosts[idx++];
      if (await pjlinkGreets(host)) {
        found.push({ kind: 'projector', host, port: 4352 });
      }
    }
  }
  await Promise.all(Array.from({ length: POOL }, worker));
  return found.sort((a, b) => a.host.localeCompare(b.host, undefined, { numeric: true }));
}

function pjlinkGreets(host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: 4352 });
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(400, () => finish(false));
    socket.on('data', (d) => finish(d.toString('ascii').startsWith('PJLINK')));
    socket.on('error', () => finish(false));
  });
}

// ---------------------------------------------------------------------------
// Art-Net packet helpers
// ---------------------------------------------------------------------------

function buildArtPoll(): Buffer {
  const pkt = Buffer.alloc(14);
  pkt.write('Art-Net\0', 0, 'ascii');
  pkt.writeUInt16LE(0x2000, 8); // OpPoll
  pkt.writeUInt8(0, 10); // ProtVerHi
  pkt.writeUInt8(14, 11); // ProtVerLo
  pkt.writeUInt8(0, 12); // TalkToMe
  pkt.writeUInt8(0, 13); // Priority
  return pkt;
}

function parseArtPollReply(msg: Buffer, fromAddress: string): DiscoveredDevice | null {
  if (msg.length < 26) return null;
  if (msg.toString('ascii', 0, 7) !== 'Art-Net') return null;
  if (msg.readUInt16LE(8) !== 0x2100) return null; // OpPollReply
  const ipFromPacket = `${msg[10]}.${msg[11]}.${msg[12]}.${msg[13]}`;
  const host = ipFromPacket === '0.0.0.0' ? fromAddress : ipFromPacket;
  const name = msg.length >= 44 ? msg.toString('ascii', 26, 44).split('\0')[0].trim() : undefined;
  return { kind: 'lighting', host, port: ARTNET_PORT, name: name || undefined };
}

function artPollOne(host: string): Promise<DiscoveredDevice | null> {
  return new Promise((resolve) => {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    let done = false;
    const finish = (r: DiscoveredDevice | null) => {
      if (done) return;
      done = true;
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      resolve(r);
    };
    socket.on('error', () => finish(null));
    socket.on('message', (msg, rinfo) => finish(parseArtPollReply(msg, rinfo.address)));
    socket.bind(() => {
      try {
        socket.setBroadcast(true);
      } catch {
        /* ignore */
      }
      socket.send(buildArtPoll(), ARTNET_PORT, host);
    });
    setTimeout(() => finish(null), 1500);
  });
}

function sendOscProbe(host: string, port: number, address: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const raw = Buffer.from(address, 'ascii');
    const addr = Buffer.alloc(Math.ceil((raw.length + 1) / 4) * 4);
    raw.copy(addr);
    const tag = Buffer.from(',f\0\0', 'ascii');
    const arg = Buffer.alloc(4);
    arg.writeFloatBE(1, 0);
    socket.send(Buffer.concat([addr, tag, arg]), port, host, (e) => {
      socket.close();
      e ? reject(e) : resolve();
    });
  });
}
