import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { sessionKeys, useSession } from '@/auth/session';
import { pathKeys } from '@/features/paths/keys';
import { progressKeys } from '@/features/progress/keys';
import { env } from '@/lib/env';
import { applyRealtimeEvent, REALTIME_EVENTS, type RealtimeContext, type RealtimeEvents } from './events';
import { openRealtimeSocket, type RealtimeSocket } from './socket';

/**
 * A handshake the API rejected for auth (Socket.IO middleware error). The contract does not pin
 * the shape yet, so this accepts the conventional ones: message or data.code UNAUTHENTICATED, or
 * data.status 401.
 */
export function isAuthConnectError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { message, data } = error as { message?: unknown; data?: { code?: unknown; status?: unknown } };
  return message === 'UNAUTHENTICATED' || data?.code === 'UNAUTHENTICATED' || data?.status === 401;
}

/** PRD-UI §5: the socket closes after 5 minutes in a hidden tab and reopens when it is shown. */
export const HIDDEN_DISCONNECT_MS = 5 * 60_000;

export interface UseRealtimeEventsOptions {
  open?: () => Promise<RealtimeSocket>;
  hiddenMs?: number;
}

/**
 * Mounted once for signed-in screens. Opens `/realtime` after sign-in and closes it on sign-out
 * (the session becomes null), so no event reaches a signed-out tab. After a reconnect, the session,
 * paths and progress are refetched in case an event was missed while disconnected. A handshake
 * rejected for auth (expired access cookie) refreshes the session once through the API client,
 * then reconnects; a failed refresh signs the learner out as everywhere else.
 */
export function useRealtimeEvents({ open = openRealtimeSocket, hiddenMs = HIDDEN_DISCONNECT_MS }: UseRealtimeEventsOptions = {}) {
  const { data: me } = useSession();
  const userId = me?.user.id;
  const client = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // `vite dev` with MSW has no socket server.
    if (!userId || env.apiMocks) return;
    let socket: RealtimeSocket | undefined;
    let cancelled = false;
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined;
    let missedEvents = false;
    // One refresh per connection attempt cycle; a successful connect resets it.
    let refreshedForSocket = false;

    const ctx: RealtimeContext = {
      client,
      pathname: () => pathnameRef.current,
      navigate: (to) => {
        void navigate(to);
      },
    };

    void open()
      .then((opened) => {
        if (cancelled) {
          opened.disconnect();
          return;
        }
        socket = opened;
        for (const name of REALTIME_EVENTS) {
          opened.on(name, (payload: RealtimeEvents[typeof name]) => {
            applyRealtimeEvent(ctx, name, payload);
          });
        }
        opened.on('disconnect', () => {
          missedEvents = true;
        });
        opened.on('connect', () => {
          refreshedForSocket = false;
          if (!missedEvents) return;
          missedEvents = false;
          // A missed entitlement.changed is recovered from auth/me.
          void client.invalidateQueries({ queryKey: sessionKeys.me() });
          void client.invalidateQueries({ queryKey: pathKeys.all });
          void client.invalidateQueries({ queryKey: progressKeys.all });
        });
        opened.on('connect_error', (error: unknown) => {
          if (cancelled || refreshedForSocket || !isAuthConnectError(error)) return;
          refreshedForSocket = true;
          missedEvents = true;
          // Refetch the session query: auth/me goes through the API client, so a 401 runs its
          // single-flight refresh and replays. If that refresh fails, the query settles on null and
          // the app signs the learner out (session-expiry.ts); the null session closes this socket.
          client
            .refetchQueries({ queryKey: sessionKeys.me(), exact: true })
            .then(() => {
              if (!cancelled && client.getQueryData(sessionKeys.me())) opened.connect();
            })
            .catch(() => undefined);
        });
      })
      .catch(() => undefined);

    const onVisibility = () => {
      clearTimeout(hiddenTimer);
      if (document.hidden) {
        hiddenTimer = setTimeout(() => socket?.disconnect(), hiddenMs);
      } else if (socket && !socket.connected) {
        socket.connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      clearTimeout(hiddenTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      socket?.disconnect();
    };
  }, [userId, client, navigate, open, hiddenMs]);
}
