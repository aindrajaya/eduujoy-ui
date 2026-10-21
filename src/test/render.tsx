import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { queryClient } from '@/query-client';
import { routes } from '@/router';

/**
 * Renders the real route table at `path` in a memory router. Loaders use the app's query
 * client, so it is cleared first; the default MSW handlers make the user signed in.
 */
export function renderRoute(path: string) {
  queryClient.clear();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return {
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}

/** Makes auth/me answer 401 and the refresh fail, i.e. a signed-out visitor. */
export function mockSignedOut() {
  const unauthorized = () =>
    problemResponse(mockProblem(401, 'UNAUTHENTICATED', 'Sign in required'));
  server.use(
    http.get('/v1/auth/me', ({ response }) => response.untyped(unauthorized())),
    http.post('/v1/auth/refresh', ({ response }) => response.untyped(unauthorized())),
  );
}
