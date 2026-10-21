import { redirect, type RouteObject } from 'react-router';
import BootSplash from './app/BootSplash';
import RouteError from './app/RouteError';
import { HOME, loadSession, requireAuth } from './auth/guards';

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
            path: 'steps/:id',
            lazy: async () => ({ Component: (await import('./features/steps/StepPage')).default }),
          },
          {
            lazy: async () => ({ Component: (await import('./app/TabsLayout')).default }),
            children: [
              {
                path: 'today',
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
