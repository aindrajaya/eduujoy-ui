import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { queryClient } from './query-client';
import { router } from './router';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// `vite dev` with VITE_API_MOCKS=true runs against the contract-typed MSW handlers.
// import.meta.env.DEV is false in production builds, so this branch and msw are tree-shaken out.
if (import.meta.env.DEV && import.meta.env.VITE_API_MOCKS === 'true') {
  const { worker } = await import('./api/mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
