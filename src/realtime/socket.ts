import { env } from '@/lib/env';

/** The part of the Socket.IO client the app uses (a fake implements it in tests). */
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
export async function openRealtimeSocket(): Promise<RealtimeSocket> {
  const { io } = await import('socket.io-client');
  return io(`${env.apiUrl}/realtime`, {
    withCredentials: true,
    // WebSocket first; long-polling when a network blocks it (PRD-API realtime row).
    transports: ['websocket', 'polling'],
    tryAllTransports: true,
  });
}
