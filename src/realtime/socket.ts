import type { Socket } from 'socket.io-client';
import { env } from '@/lib/env';

export type RealtimeSocket = Pick<Socket, 'on' | 'off' | 'connect' | 'disconnect' | 'connected'>;

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
