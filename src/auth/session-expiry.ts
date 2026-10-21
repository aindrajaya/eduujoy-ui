import type { QueryClient } from '@tanstack/react-query';
import type { createBrowserRouter } from 'react-router';
import { setSessionExpiredHandler } from '@/api/session-events';

type AppRouter = Pick<ReturnType<typeof createBrowserRouter>, 'state' | 'navigate'>;

/**
 * PRD-UI §5/§6: when a refresh fails mid-session, drop cached data and send the learner to
 * /signin with a one-line notice, keeping where they were as `next`. Quiz drafts live in their
 * own storage (U5) and survive this.
 */
export function installSessionExpiry(router: AppRouter, client: QueryClient): () => void {
  setSessionExpiredHandler(({ url }) => {
    // auth/me failing means "signed out", which the route guards already handle without a notice.
    if (url?.endsWith('/v1/auth/me')) return;
    client.clear();
    const { pathname, search } = router.state.location;
    if (pathname === '/signin' || pathname === '/signup') return;
    const params = new URLSearchParams({ next: pathname + search, expired: '1' });
    void router.navigate(`/signin?${params.toString()}`, { replace: true });
  });
  return () => {
    setSessionExpiredHandler(undefined);
  };
}
