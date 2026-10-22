import type { LoaderFunctionArgs, RouteObject } from 'react-router';
import type { Role } from '@/api/types';
import { loadSession, requireAuth, requireRole } from './guards';
import { hasRole } from './session';

interface ScreenModule {
  default: NonNullable<RouteObject['Component']>;
}

interface StaffRoute {
  loader: (args: LoaderFunctionArgs) => unknown;
  Component?: ScreenModule['default'];
}

/**
 * U11: what a staff route's lazy() resolves to. React Router runs lazy() alongside the loaders, so
 * a plain role loader would still download the screen for a learner. This checks the session
 * first and, without the role, returns only a guard loader (redirect to /signin, or 403): the
 * screen's chunk is never imported. React Router caches the result for the session, so if the role
 * is there by the time the guard runs again (another account signed in on this tab), it reloads
 * the page to get a fresh router. With the role, the guard stays as the route's loader.
 */
export async function roleRoute(roles: readonly Role[], load: () => Promise<ScreenModule>): Promise<StaffRoute> {
  const me = await loadSession().catch(() => null);
  if (!hasRole(me, roles)) {
    return {
      loader: async ({ request }: LoaderFunctionArgs) => {
        const current = await requireAuth(request);
        if (hasRole(current, roles)) {
          window.location.assign(request.url);
          return null;
        }
        throw new Response('You do not have access to this page.', { status: 403 });
      },
    };
  }
  return {
    loader: ({ request }: LoaderFunctionArgs) => requireRole(request, roles),
    Component: (await load()).default,
  };
}
