// Realtime transport that keeps the three ImmerseOS surfaces in lockstep.
//
//  - BroadcastChannel links same-origin tabs/windows on one machine
//    (e.g. the Control window and a Projection window on the second display).
//  - WebSocket links other devices — most importantly the phone Remote — to
//    the embedded relay server that the Electron app runs on the LAN.
//
// Both are optional and chosen automatically, so the whole UI still works in a
// single browser tab with neither available.

import type { SyncMessage } from './types';

export const CLIENT_ID = Math.random().toString(36).slice(2, 10);

type Listener = (msg: SyncMessage) => void;

export class Sync {
  private bc?: BroadcastChannel;
  private ws?: WebSocket;
  private listeners = new Set<Listener>();
  private wsReady = false;
  private queue: SyncMessage[] = [];

  constructor(opts: { useWebSocket?: boolean; wsUrl?: string } = {}) {
    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel('immerseos-room');
      this.bc.onmessage = (e) => this.dispatch(e.data as SyncMessage);
    }
    if (opts.useWebSocket) {
      this.connectWs(opts.wsUrl ?? defaultWsUrl());
    }
  }

  private connectWs(url: string) {
    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.wsReady = true;
        this.queue.forEach((m) => this.ws!.send(JSON.stringify(m)));
        this.queue = [];
        this.send({ kind: 'hello', origin: CLIENT_ID });
      };
      this.ws.onmessage = (e) => {
        try {
          this.dispatch(JSON.parse(e.data) as SyncMessage);
        } catch {
          /* ignore malformed frames */
        }
      };
      this.ws.onclose = () => {
        this.wsReady = false;
        // best-effort reconnect for long-running room sessions
        setTimeout(() => this.connectWs(url), 2000);
      };
      this.ws.onerror = () => this.ws?.close();
    } catch {
      /* websocket unavailable; BroadcastChannel still works */
    }
  }

  private dispatch(msg: SyncMessage) {
    if (msg.origin === CLIENT_ID) return; // never echo our own messages
    this.listeners.forEach((l) => l(msg));
  }

  on(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(msg: SyncMessage) {
    this.bc?.postMessage(msg);
    if (this.ws) {
      if (this.wsReady) this.ws.send(JSON.stringify(msg));
      else this.queue.push(msg);
    }
  }

  dispose() {
    this.bc?.close();
    this.ws?.close();
    this.listeners.clear();
  }
}

function defaultWsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  // The embedded relay listens on the same host, port + 1 of the page port,
  // or a dedicated port in production. We default to the well-known 7501.
  const host = location.hostname || 'localhost';
  return `${proto}://${host}:7501`;
}
