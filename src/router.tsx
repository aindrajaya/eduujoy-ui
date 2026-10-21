import { redirect, type RouteObject } from 'react-router';
import BootSplash from './app/BootSplash';
import RouteError from './app/RouteError';
import { HOME, loadSession, publicOnly, requireAuth } from './auth/guards';

// Every screen is a lazy chunk. The shell holds only the boot splash, the error boundary and the
// session guards, which run in loaders so no protected markup renders before auth/me resolves.
export const routes: RouteObject[] = [
  {
    id: 'root',
    path: '/',
    loader: () => loadSession(),
    HydrateFallback: BootSplash,
    ErrorBoundary: RouteError,
    lazy: async () => ({ Component: (await import('./app/RootLayout')).default }),
    children: [
      {
        index: true,
        loader: async () => redirect((await loadSession()) ? HOME : '/signin'),
      },
      {
        path: 'signin',
        loader: ({ request }) => publicOnly(request),
        lazy: async () => ({ Component: (await import('./auth/SignInPage')).default }),
      },
      {
        path: 'signup',
        loader: ({ request }) => publicOnly(request),
        lazy: async () => ({ Component: (await import('./auth/SignUpPage')).default }),
      },
      {
        id: 'protected',
        loader: ({ request }) => requireAuth(request),
        children: [
          {
            path: 'start',
            lazy: async () => ({
              Component: (await import('./features/onboarding/StartPage')).default,
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
