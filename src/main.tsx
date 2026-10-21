import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { installSessionExpiry } from './auth/session-expiry';
import { queryClient } from './query-client';
import { routes } from './router';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// `vite dev` or a `--mode mock` build (Lighthouse CI) with VITE_API_MOCKS=true runs against the
// contract-typed MSW handlers. Production builds have MODE 'production' and DEV false, so this
// branch and msw are tree-shaken out.
if (
  (import.meta.env.DEV || import.meta.env.MODE === 'mock') &&
  import.meta.env.VITE_API_MOCKS === 'true'
) {
  const { startMockWorker } = await import('./api/mocks/browser');
  await startMockWorker();
}

// Created after the mock worker starts: createBrowserRouter runs the initial loaders immediately.
const router = createBrowserRouter(routes);
installSessionExpiry(router, queryClient);

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
