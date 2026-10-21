import type { QueryClient } from '@tanstack/react-query';
import type { createBrowserRouter } from 'react-router';
import { setSessionExpiredHandler } from '@/api/session-events';
import { sessionKeys } from './session';

type AppRouter = Pick<ReturnType<typeof createBrowserRouter>, 'state' | 'navigate'>;

const PUBLIC_PATHS = new Set(['/signin', '/signup']);
const SESSION_HASH = JSON.stringify(sessionKeys.me());

/**
 * PRD-UI §5/§6: when the session ends mid-visit, drop cached data and send the learner to
 * /signin with a one-line notice, keeping where they were as `next`. Two triggers:
 * - a data call's refresh fails (the API client reports it);
 * - auth/me resolves to signed out while a protected screen is idle (e.g. a refetch when the
 *   tab regains focus).
 * Quiz drafts live in their own storage (U5) and survive this.
 */
export function installSessionExpiry(router: AppRouter, client: QueryClient): () => void {
  const sendToSignIn = () => {
    const { pathname, search, hash } = router.state.location;
    if (PUBLIC_PATHS.has(pathname)) return;
    client.clear();
    const params = new URLSearchParams({ next: pathname + search + hash, expired: '1' });
    void router.navigate(`/signin?${params.toString()}`, { replace: true });
  };

  setSessionExpiredHandler(({ url }) => {
    // auth/me is handled by the session listener below, once its query settles on null.
    if (url?.endsWith('/v1/auth/me')) return;
    sendToSignIn();
  });

  const unsubscribe = client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return;
    if (event.query.queryHash !== SESSION_HASH || event.query.state.data !== null) return;
    // During the first load or a navigation, the route loaders redirect on their own.
    if (!router.state.initialized || router.state.navigation.state !== 'idle') return;
    sendToSignIn();
  });

  return () => {
    unsubscribe();
    setSessionExpiredHandler(undefined);
  };
}
