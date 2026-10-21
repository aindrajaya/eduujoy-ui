import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockProgress, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { openedSockets } from '@/test/fakeSocket';
import { renderRoute } from '@/test/render';
import { resetToasts } from '@/ui/toast/store';

afterEach(() => {
  act(() => {
    resetToasts();
  });
  vi.useRealTimers();
});

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useRealtimeEvents (PRD-UI §5)', () => {
  it('opens the socket once signed in and updates the screen from a server event', async () => {
    let calls = 0;
    server.use(
      http.get('/v1/progress', ({ response }) => {
        calls += 1;
        const item = mockProgress.items[0]!;
        return response(200).json({
          items: [calls === 1 ? item : { ...item, position: { stage: 'competent', bloom: 'C3' } }],
        });
      }),
    );
    renderRoute('/progress');
    expect(await screen.findByText('Advanced beginner · C3 Apply')).toBeInTheDocument();
    // The socket opens once the first paint has settled (1 s) and the bridge chunk has loaded.
    await waitFor(
      () => {
        expect(openedSockets).toHaveLength(1);
      },
      { timeout: 3000 },
    );

    act(() => {
      openedSockets[0]!.serverEmit('stage.advanced', {
        topicId: 'topic-ux',
        from: { stage: 'advanced_beginner', bloom: 'C4' },
        to: { stage: 'competent', bloom: 'C3' },
        reassessmentJobId: null,
      });
    });
    expect(await screen.findByText('Competent · C3 Apply')).toBeInTheDocument();
    expect((await screen.findAllByText('You moved up to Competent')).length).toBeGreaterThan(0);
  });

  it('does not open a socket for a signed-out visitor', async () => {
    server.use(http.get('/v1/auth/me', ({ response }) => response.untyped(problemResponse(mockProblem(401, 'UNAUTHENTICATED', 'x')))));
    server.use(http.post('/v1/auth/refresh', ({ response }) => response.untyped(problemResponse(mockProblem(401, 'UNAUTHENTICATED', 'x')))));
    renderRoute('/signin');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(openedSockets).toHaveLength(0);
  });

  it('closes after 5 minutes hidden, then reconnects when shown and refetches what it may have missed', async () => {
    let progressLoads = 0;
    server.use(
      http.get('/v1/progress', ({ response }) => {
        progressLoads += 1;
        return response(200).json(mockProgress);
      }),
    );
    renderRoute('/progress');
    await screen.findByText('Advanced beginner · C3 Apply');
    await waitFor(
      () => {
        expect(openedSockets).toHaveLength(1);
      },
      { timeout: 3000 },
    );
    const socket = openedSockets[0]!;

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    act(() => {
      setHidden(true);
    });
    act(() => {
      vi.advanceTimersByTime(4 * 60_000);
    });
    expect(socket.connected).toBe(true);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(socket.connected).toBe(false);
    vi.useRealTimers();

    act(() => {
      setHidden(false);
    });
    expect(socket.connected).toBe(true);
    await waitFor(() => {
      expect(progressLoads).toBe(2);
    });
  });
});
