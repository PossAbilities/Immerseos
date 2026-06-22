// The embedded room server. It does two jobs:
//   1. Serves the built web bundle so phones on the same Wi-Fi can open the
//      remote (http://<lan-ip>:7500/remote.html).
//   2. Runs a WebSocket relay (port 7501) that fans every control message out
//      to all connected surfaces — control window, projection, phone remotes.

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { networkInterfaces } from 'node:os';
import type { Server } from 'node:http';

export const HTTP_PORT = 7500;
export const WS_PORT = 7501;

let httpServer: Server | undefined;
let wss: WebSocketServer | undefined;

/** First non-internal IPv4 address — the address phones should connect to. */
export function getLanIp(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

export function remoteUrl(): string {
  return `http://${getLanIp()}:${HTTP_PORT}/remote.html`;
}

export function startServer(distPath: string) {
  // --- static bundle ---
  const app = express();
  app.use(express.static(distPath));
  app.get('/health', (_req, res) => res.json({ ok: true, ip: getLanIp() }));
  httpServer = app.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`[immerseos] static server → http://${getLanIp()}:${HTTP_PORT}`);
  });

  // --- realtime relay ---
  // Each socket's role is learned from its 'hello'. The relay is the single
  // source of truth for how many phone remotes are connected and broadcasts
  // that count whenever it changes, so no surface has to guess.
  const roles = new WeakMap<WebSocket, string>();

  const broadcastPresence = () => {
    let remotes = 0;
    for (const client of wss!.clients) {
      if (roles.get(client) === 'remote') remotes++;
    }
    const msg = JSON.stringify({
      kind: 'presence',
      id: `relay-${Date.now()}`,
      origin: 'relay',
      remotes,
    });
    for (const client of wss!.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    }
  };

  wss = new WebSocketServer({ port: WS_PORT });
  wss.on('connection', (socket) => {
    socket.on('message', (data) => {
      const text = data.toString();
      try {
        const msg = JSON.parse(text);
        if (msg.kind === 'hello' && typeof msg.role === 'string') {
          roles.set(socket, msg.role);
          broadcastPresence();
        }
      } catch {
        /* non-JSON frame — just relay it */
      }
      // relay to everyone except the sender
      for (const client of wss!.clients) {
        if (client !== socket && client.readyState === WebSocket.OPEN) {
          client.send(text);
        }
      }
    });
    socket.on('close', broadcastPresence);
  });
  console.log(`[immerseos] relay listening on ws://${getLanIp()}:${WS_PORT}`);
}

export function stopServer() {
  httpServer?.close();
  wss?.close();
}
