// Minimal OSC decoder, just enough to read TUIO 1.1 traffic. TUIO is OSC over
// UDP; the encode counterpart already lives in OscDriver. No dependencies.

export interface OscMessage {
  address: string;
  args: Array<number | string>;
}

function readString(buf: Buffer, off: number): { value: string; next: number } {
  let end = off;
  while (end < buf.length && buf[end] !== 0) end++;
  const value = buf.toString('ascii', off, end);
  let next = end + 1;
  next = Math.ceil(next / 4) * 4; // OSC strings pad to a 4-byte boundary
  return { value, next };
}

function parseMessage(buf: Buffer): OscMessage | null {
  try {
    const a = readString(buf, 0);
    const address = a.value;
    const t = readString(buf, a.next);
    if (!t.value.startsWith(',')) return null;
    let off = t.next;
    const args: Array<number | string> = [];
    for (let i = 1; i < t.value.length; i++) {
      const tag = t.value[i];
      if (tag === 'i') {
        args.push(buf.readInt32BE(off));
        off += 4;
      } else if (tag === 'f') {
        args.push(buf.readFloatBE(off));
        off += 4;
      } else if (tag === 's') {
        const s = readString(buf, off);
        args.push(s.value);
        off = s.next;
      } else if (tag === 'b') {
        const len = buf.readUInt32BE(off);
        off += 4 + Math.ceil(len / 4) * 4;
        args.push(0);
      } else {
        break; // unknown tag — stop parsing args
      }
    }
    return { address, args };
  } catch {
    return null;
  }
}

/** Decode an OSC packet (message or #bundle, recursively) into flat messages. */
export function parseOscPacket(buf: Buffer): OscMessage[] {
  if (buf.length >= 16 && buf[7] === 0 && buf.toString('ascii', 0, 7) === '#bundle') {
    const out: OscMessage[] = [];
    let off = 16; // 8-byte "#bundle\0" + 8-byte timetag
    while (off + 4 <= buf.length) {
      const size = buf.readUInt32BE(off);
      off += 4;
      if (size <= 0 || off + size > buf.length) break;
      out.push(...parseOscPacket(buf.subarray(off, off + size)));
      off += size;
    }
    return out;
  }
  const msg = parseMessage(buf);
  return msg ? [msg] : [];
}

export function isTuioCursorAddress(address: string): boolean {
  return address === '/tuio/2Dcur';
}

export function looksLikeTuio(address: string): boolean {
  return address.startsWith('/tuio/');
}
