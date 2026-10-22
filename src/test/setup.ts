import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { resetActivity } from '@/api/activity';
import { server } from '@/api/mocks/server';
import { openedSockets } from './fakeSocket';

// No test opens a real socket: `/realtime` is an in-memory fake that tests drive (fakeSocket.ts).
vi.mock('@/realtime/socket', async () => ({ openRealtimeSocket: (await import('./fakeSocket')).openFakeSocket }));

// findBy*/waitFor wait up to 10 s (default 1 s): lazy route chunks, MSW and axe can take far longer
// on a loaded CI runner, and a longer ceiling never makes a passing test slower. Tests set no
// timeouts of their own; this and testTimeout (vite.config.ts) are the only ones.
configure({ asyncUtilTimeout: 10_000 });

// jsdom has no pointer capture; Radix primitives (toast swipe) call it.
Object.assign(Element.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
});

// Every test runs against the contract-typed MSW handlers; unknown requests fail loudly.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetActivity();
  openedSockets.length = 0;
});

afterAll(() => {
  server.close();
});
