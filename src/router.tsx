import { redirect, type RouteObject } from 'react-router';
import type { Role } from './api/types';
import BootSplash from './app/BootSplash';
import RouteError from './app/RouteError';
import { HOME, loadSession, requireAuth } from './auth/guards';
import { queryClient } from './query-client';

/**
 * Starts a path screen's requests once auth/me resolves, without blocking the route on them: the
 * path (or, without an id, the active path) loads while the page chunk does (PRD-UI §9 LCP budget).
 */
function prefetchPathData(pathId: string | null): null {
  const queries = import('./features/paths/pathQueries');
  void loadSession()
    .then(async (me) => {
      if (!me) return;
      const { prefetchActivePath, pathQuery } = await queries;
      await (pathId ? queryClient.query(pathQuery(pathId)) : prefetchActivePath(queryClient));
    })
    .catch(() => undefined);
  return null;
}

const STAFF: readonly Role[] = ['reviewer', 'admin'];
const ADMIN: readonly Role[] = ['admin'];

// U11: staff screens. The role check lives in its own module (auth/roleRoute.ts) so the shell, and
// with it the /signin budget, does not carry it; see that file for why lazy() checks the role.
const staffRoute =
  (roles: readonly Role[], load: () => Promise<{ default: NonNullable<RouteObject['Component']> }>) => async () =>
    (await import('./auth/roleRoute')).roleRoute(roles, load);

// Every screen is a lazy chunk. The shell holds only the boot splash, the error boundary and the
// session guards. Protected routes wait for auth/me in their loader (behind the boot splash), so no
// protected markup renders first; /signin and /signup render at once and redirect via useSession.
export const routes: RouteObject[] = [
  {
    id: 'root',
    path: '/',
    // Starts auth/me as early as possible without blocking public screens on it.
    loader: () => {
      void loadSession().catch(() => undefined);
      return null;
    },
    HydrateFallback: BootSplash,
    ErrorBoundary: RouteError,
    lazy: async () => ({ Component: (await import('./app/RootLayout')).default }),
    children: [
      {
        index: true,
        loader: async () => redirect((await loadSession()) ? HOME : '/signin'),
        HydrateFallback: BootSplash,
      },
      {
        path: 'signin',
        lazy: async () => ({ Component: (await import('./auth/SignInPage')).default }),
      },
      {
        path: 'signup',
        lazy: async () => ({ Component: (await import('./auth/SignUpPage')).default }),
      },
      {
        id: 'protected',
        loader: ({ request }) => requireAuth(request),
        HydrateFallback: BootSplash,
        lazy: async () => ({ Component: (await import('./app/ProtectedLayout')).default }),
        children: [
          {
            path: 'start',
            lazy: async () => ({
              Component: (await import('./features/onboarding/StartPage')).default,
            }),
          },
          // E2E-only harness; import.meta.env.MODE is a build-time constant, so production drops it.
          ...(import.meta.env.MODE === 'e2e'
            ? [
                {
                  path: 'dev/quiz-lab',
                  lazy: async () => ({ Component: (await import('./dev/QuizLabPage')).default }),
                },
              ]
            : []),
          {
            path: 'paths/new/:jobId',
            lazy: async () => ({
              Component: (await import('./features/paths/GenerationPage')).default,
            }),
          },
          {
            path: 'diagnostic/:id',
            lazy: async () => ({
              Component: (await import('./features/diagnostic/DiagnosticPage')).default,
            }),
          },
          {
            path: 'checkpoints/:id',
            loader: ({ request }) => prefetchPathData(new URL(request.url).searchParams.get('path')),
            lazy: async () => ({
              Component: (await import('./features/checkpoints/CheckpointPage')).default,
            }),
          },
          {
            path: 'admin',
            children: [
              { index: true, loader: () => redirect('/admin/review') },
              { path: 'review', lazy: staffRoute(STAFF, () => import('./features/admin/ReviewQueuePage')) },
              { path: 'metrics', lazy: staffRoute(ADMIN, () => import('./features/admin/MetricsPage')) },
            ],
          },
          {
            path: 'steps/:id',
            loader: ({ request }) => prefetchPathData(new URL(request.url).searchParams.get('path')),
            lazy: async () => ({ Component: (await import('./features/steps/StepPage')).default }),
          },
          {
            lazy: async () => ({ Component: (await import('./app/TabsLayout')).default }),
            children: [
              {
                path: 'today',
                loader: () => prefetchPathData(null),
                lazy: async () => ({
                  Component: (await import('./features/paths/TodayPage')).default,
                }),
              },
              {
                path: 'paths',
                lazy: async () => ({
                  Component: (await import('./features/paths/PathsPage')).default,
                }),
              },
              {
                path: 'paths/:id',
                lazy: async () => ({
                  Component: (await import('./features/paths/PathPage')).default,
                }),
              },
              {
                path: 'progress',
                lazy: async () => ({
                  Component: (await import('./features/progress/ProgressPage')).default,
                }),
              },
              {
                path: 'account',
                lazy: async () => ({
                  Component: (await import('./features/account/AccountPage')).default,
                }),
              },
            ],
          },
        ],
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('./app/NotFound')).default }),
      },
    ],
  },
];
