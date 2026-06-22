// Realtime transport that keeps the three ImmerseOS surfaces in lockstep.
//
//  - BroadcastChannel links same-origin tabs/windows on one machine
//    (e.g. the Control window and a Projection window on the second display).
//  - WebSocket links other devices — most importantly the phone Remote — to
//    the embedded relay server that the Electron app runs on the LAN.
//
// Both are optional and chosen automatically, so the whole UI still works in a
// single browser tab with neither available. Because a surface may receive the
// same message over BOTH transports (control and projection are same-origin AND
// both on the relay), every message carries a unique id and is de-duplicated.

import type { SurfaceRole, SyncMessage } from './types';

export const CLIENT_ID = Math.random().toString(36).slice(2, 10);

type Listener = (msg: SyncMessage) => void;

let msgSeq = 0;
export function nextMessageId(): string {
  return `${CLIENT_ID}-${msgSeq++}`;
}

export class Sync {
  private bc?: BroadcastChannel;
  private ws?: WebSocket;
  private listeners = new Set<Listener>();
  private wsReady = false;
  private queue: SyncMessage[] = [];
  private disposed = false;
  private role: SurfaceRole;
  private seen: string[] = []; // small LRU of recently seen message ids

  constructor(opts: { role: SurfaceRole; useWebSocket?: boolean; wsUrl?: string }) {
    this.role = opts.role;
    if (typeof BroadcastChannel !== 'undefined') {
      this.bc = new BroadcastChannel('immerseos-room');
      this.bc.onmessage = (e) => this.dispatch(e.data as SyncMessage);
    }
    if (opts.useWebSocket) {
      this.connectWs(opts.wsUrl ?? defaultWsUrl());
    }
  }

  private connectWs(url: string) {
    if (this.disposed) return;
    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.wsReady = true;
        this.queue.forEach((m) => this.ws!.send(JSON.stringify(m)));
        this.queue = [];
        this.send({ kind: 'hello', id: nextMessageId(), origin: CLIENT_ID, role: this.role });
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
        if (!this.disposed) setTimeout(() => this.connectWs(url), 2000);
      };
      this.ws.onerror = () => this.ws?.close();
    } catch {
      /* websocket unavailable; BroadcastChannel still works */
    }
  }

  private dispatch(msg: SyncMessage) {
    if (msg.origin === CLIENT_ID) return; // never echo our own messages
    if (msg.id && this.seen.includes(msg.id)) return; // already handled
    if (msg.id) {
      this.seen.push(msg.id);
      if (this.seen.length > 200) this.seen.shift();
    }
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
    this.disposed = true;
    this.bc?.close();
    this.ws?.close();
    this.listeners.clear();
  }
}

function defaultWsUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  // The embedded relay listens on the same host on a dedicated port.
  const host = location.hostname || 'localhost';
  return `${proto}://${host}:7501`;
}
