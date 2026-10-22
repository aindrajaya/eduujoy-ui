import { setupWorker } from 'msw/browser';
import { handlers, http, problemResponse } from './handlers';
import { mockProblem } from './data';

/** Dev and `--mode mock` only (VITE_API_MOCKS=true). Never imported by production builds. */
export const worker = setupWorker(...handlers);

/**
 * Starts the mock API. Loading any page with `?mock=signed-out` makes the whole visit signed out,
 * so /signin can be audited too (Lighthouse CI).
 */
export async function startMockWorker(): Promise<void> {
  if (new URLSearchParams(window.location.search).get('mock') === 'signed-out') {
    const unauthorized = () => problemResponse(mockProblem(401, 'UNAUTHENTICATED', 'Sign in required'));
    worker.use(
      http.get('/v1/auth/me', ({ response }) => response.untyped(unauthorized())),
      http.post('/v1/auth/refresh', ({ response }) => response.untyped(unauthorized())),
    );
  }
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}
