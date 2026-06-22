import net from 'node:net';
import { createHash } from 'node:crypto';

/**
 * Run a single PJLink Class-1 command over a short-lived TCP connection and
 * resolve the projector's reply line. Handles the optional md5 digest auth and
 * pipelined greeting+response segments. Shared by the live driver and the
 * discovery/test paths so the protocol logic lives in exactly one place.
 */
export function pjlinkCommand(opts: {
  host: string;
  port: number;
  password?: string;
  command: string;
  timeoutMs?: number;
}): Promise<string> {
  const { host, port, password, command, timeoutMs = 4000 } = opts;
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let greeted = false;
    let buf = '';
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('PJLink timeout'));
    }, timeoutMs);

    const done = (fn: () => void) => {
      clearTimeout(timer);
      socket.destroy();
      fn();
    };

    socket.on('data', (chunk) => {
      buf += chunk.toString('ascii');
      if (!greeted && buf.includes('\r')) {
        greeted = true;
        const idx = buf.indexOf('\r');
        const greeting = buf.slice(0, idx);
        buf = buf.slice(idx + 1); // keep any bytes already pipelined after it
        let prefix = '';
        if (greeting.startsWith('PJLINK 1')) {
          const seed = greeting.split(' ')[2] ?? '';
          prefix = createHash('md5').update(seed + (password ?? '')).digest('hex');
        } else if (greeting.startsWith('PJLINK ERRA')) {
          return done(() => reject(new Error('PJLink auth error')));
        }
        socket.write(prefix + command + '\r');
        // fall through: the response may already be in the same segment
      }
      if (greeted && buf.includes('\r')) {
        done(() => resolve(buf.split('\r')[0]));
      }
    });
    socket.on('error', (e) => done(() => reject(e)));
  });
}
