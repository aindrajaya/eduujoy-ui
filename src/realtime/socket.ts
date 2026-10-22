import { env } from '@/lib/env';

/**
 * The part of the Socket.IO client the app uses (a fake implements it in tests). Besides the
 * socket's own events, 'reconnect_failed' fires once automatic reconnection has given up.
 */
export interface RealtimeSocket {
  readonly connected: boolean;
  on(event: string, listener: (...args: never[]) => void): unknown;
  connect(): unknown;
  disconnect(): unknown;
}

/**
 * PRD-UI §5: the Socket.IO client is imported only after sign-in, so no screen's initial JS pays
 * for it. The API checks the session cookie in the handshake (contract x-socket-events).
 */
/** Automatic reconnection gives up after this many failed attempts (useRealtimeEvents retries later). */
export const RECONNECT_ATTEMPTS = 5;

export async function openRealtimeSocket(): Promise<RealtimeSocket> {
  const { io } = await import('socket.io-client');
  const socket = io(`${env.apiUrl}/realtime`, {
    withCredentials: true,
    // WebSocket first; long-polling when a network blocks it (PRD-API realtime row).
    transports: ['websocket', 'polling'],
    tryAllTransports: true,
    // An endpoint that is not live yet (404 until A11) must not be retried forever.
    reconnectionAttempts: RECONNECT_ATTEMPTS,
  });
  return {
    get connected() {
      return socket.connected;
    },
    on(event, listener) {
      // 'reconnect_failed' is the manager's event, not the socket's.
      if (event === 'reconnect_failed') socket.io.on('reconnect_failed', listener);
      else socket.on(event, listener as (...args: unknown[]) => void);
    },
    connect: () => socket.connect(),
    disconnect: () => socket.disconnect(),
  };
}
