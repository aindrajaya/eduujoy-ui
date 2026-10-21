import { createBrowserRouter, redirect, type RouteObject } from 'react-router';

// Every route is a lazy chunk; the shell holds only layout and routing.
export const routes: RouteObject[] = [
  {
    path: '/',
    lazy: async () => ({ Component: (await import('./app/RootLayout')).default }),
    children: [
      {
        // U2 replaces this with a session-aware redirect (/today when signed in).
        index: true,
        lazy: () => Promise.resolve({ loader: () => redirect('/start') }),
      },
      {
        path: 'start',
        lazy: async () => ({
          Component: (await import('./features/onboarding/StartPage')).default,
        }),
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
      {
        path: 'steps/:id',
        lazy: async () => ({ Component: (await import('./features/steps/StepPage')).default }),
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('./app/NotFound')).default }),
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
