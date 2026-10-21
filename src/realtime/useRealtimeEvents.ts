import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useSession } from '@/auth/session';
import { pathKeys } from '@/features/paths/keys';
import { progressKeys } from '@/features/progress/keys';
import { env } from '@/lib/env';
import { applyRealtimeEvent, REALTIME_EVENTS, type RealtimeContext, type RealtimeEvents } from './events';
import { openRealtimeSocket, type RealtimeSocket } from './socket';

/** PRD-UI §5: the socket closes after 5 minutes in a hidden tab and reopens when it is shown. */
export const HIDDEN_DISCONNECT_MS = 5 * 60_000;

export interface UseRealtimeEventsOptions {
  open?: () => Promise<RealtimeSocket>;
  hiddenMs?: number;
}

/**
 * Mounted once for signed-in screens. Opens `/realtime` after sign-in and closes it on sign-out
 * (the session becomes null), so no event reaches a signed-out tab. After a reconnect, paths and
 * progress are refetched in case an event was missed while disconnected.
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
          if (!missedEvents) return;
          missedEvents = false;
          void client.invalidateQueries({ queryKey: pathKeys.all });
          void client.invalidateQueries({ queryKey: progressKeys.all });
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
