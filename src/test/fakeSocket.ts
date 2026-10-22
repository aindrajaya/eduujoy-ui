import type { RealtimeSocket } from '@/realtime/socket';

type Listener = (...args: never[]) => void;

/** An in-memory stand-in for the Socket.IO client; tests emit server events through it. */
export class FakeSocket implements RealtimeSocket {
  connected = true;
  connectCalls = 0;
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener) {
    const set = this.listeners.get(event) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(event, set);
    return this;
  }

  connect() {
    this.connectCalls += 1;
    if (!this.connected) {
      this.connected = true;
      this.serverEmit('connect');
    }
    return this;
  }

  disconnect() {
    if (this.connected) {
      this.connected = false;
      this.serverEmit('disconnect');
    }
    return this;
  }

  /** The server rejects the handshake (e.g. an expired access cookie): disconnected plus connect_error. */
  rejectHandshake(error: unknown) {
    this.connected = false;
    this.serverEmit('connect_error', error);
  }

  /** Delivers an event as if the server sent it. */
  serverEmit(event: string, ...args: unknown[]) {
    for (const listener of this.listeners.get(event) ?? []) (listener as (...a: unknown[]) => void)(...args);
  }
}

/** Sockets opened during the current test, newest last. */
export const openedSockets: FakeSocket[] = [];

export function openFakeSocket(): Promise<FakeSocket> {
  const socket = new FakeSocket();
  openedSockets.push(socket);
  return Promise.resolve(socket);
}
