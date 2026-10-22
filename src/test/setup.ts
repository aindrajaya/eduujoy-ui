import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { resetActivity } from '@/api/activity';
import { server } from '@/api/mocks/server';
import { openedSockets } from './fakeSocket';

// No test opens a real socket: `/realtime` is an in-memory fake that tests drive (fakeSocket.ts).
vi.mock('@/realtime/socket', async () => ({ openRealtimeSocket: (await import('./fakeSocket')).openFakeSocket }));

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
