import { createBrowserRouter, type RouteObject } from 'react-router';

// Every route is a lazy chunk; the shell holds only layout and routing.
export const routes: RouteObject[] = [
  {
    path: '/',
    lazy: async () => ({ Component: (await import('./app/RootLayout')).default }),
    children: [
      {
        lazy: async () => ({ Component: (await import('./app/TabsLayout')).default }),
        children: [
          {
            path: 'today',
            lazy: async () => ({
              Component: (await import('./features/paths/TodayPage')).default,
            }),
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

export const router = createBrowserRouter(routes);
