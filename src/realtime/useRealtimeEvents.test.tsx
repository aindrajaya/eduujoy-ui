import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { mockMe, mockProgress, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { installSessionExpiry } from '@/auth/session-expiry';
import { sessionKeys } from '@/auth/session';
import { queryClient } from '@/query-client';
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
    await waitFor(() => {
      expect(openedSockets).toHaveLength(1);
    });

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

  it('closes after 5 minutes hidden, then reconnects when shown and refetches the session, paths and progress', async () => {
    let progressLoads = 0;
    server.use(
      http.get('/v1/progress', ({ response }) => {
        progressLoads += 1;
        return response(200).json(mockProgress);
      }),
    );
    renderRoute('/progress');
    await screen.findByText('Advanced beginner · C3 Apply');
    await waitFor(() => {
      expect(openedSockets).toHaveLength(1);
    });
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

    let meLoads = 0;
    server.use(
      http.get('/v1/auth/me', ({ response }) => {
        meLoads += 1;
        return response(200).json(mockMe);
      }),
    );
    act(() => {
      setHidden(false);
    });
    expect(socket.connected).toBe(true);
    await waitFor(() => {
      expect(progressLoads).toBe(2);
    });
    // A missed entitlement.changed is recovered from auth/me.
    await waitFor(() => {
      expect(meLoads).toBe(1);
    });
  });

  it('an expired access cookie at the handshake refreshes the session once, then reconnects', async () => {
    let refreshes = 0;
    server.use(
      http.post('/v1/auth/refresh', ({ response }) => {
        refreshes += 1;
        return response(204).empty();
      }),
    );
    renderRoute('/progress');
    await screen.findByText('Advanced beginner · C3 Apply');
    await waitFor(() => {
      expect(openedSockets).toHaveLength(1);
    });
    const socket = openedSockets[0]!;
    let meCalls = 0;
    server.use(
      http.get('/v1/auth/me', ({ response }) => {
        meCalls += 1;
        // The first auth/me sees the same expired cookie; after the refresh it succeeds.
        return meCalls === 1
          ? response.untyped(problemResponse(mockProblem(401, 'UNAUTHENTICATED', 'Expired')))
          : response(200).json(mockMe);
      }),
    );

    act(() => {
      socket.rejectHandshake(Object.assign(new Error('UNAUTHENTICATED'), { data: { code: 'UNAUTHENTICATED' } }));
    });
    await waitFor(() => {
      expect(socket.connected).toBe(true);
    });
    expect(refreshes).toBe(1);
    expect(socket.connectCalls).toBe(1);

    // A second rejection right after a good connect gets its own single refresh, never a loop.
    meCalls = 0;
    act(() => {
      socket.rejectHandshake(new Error('UNAUTHENTICATED'));
      socket.rejectHandshake(new Error('UNAUTHENTICATED'));
    });
    await waitFor(() => {
      expect(socket.connected).toBe(true);
    });
    expect(refreshes).toBe(2);
  });

  it('a failed refresh after a rejected handshake signs the learner out and closes the socket', async () => {
    const { router } = renderRoute('/progress');
    // main.tsx installs this for the app; renderRoute does not.
    const uninstall = installSessionExpiry(router, queryClient);
    onTestFinished(uninstall);
    await screen.findByText('Advanced beginner · C3 Apply');
    await waitFor(() => {
      expect(openedSockets).toHaveLength(1);
    });
    const socket = openedSockets[0]!;
    const unauthorized = () => problemResponse(mockProblem(401, 'UNAUTHENTICATED', 'Signed out'));
    server.use(
      http.get('/v1/auth/me', ({ response }) => response.untyped(unauthorized())),
      http.post('/v1/auth/refresh', ({ response }) => response.untyped(unauthorized())),
    );

    act(() => {
      socket.rejectHandshake(new Error('UNAUTHENTICATED'));
    });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/signin');
    });
    expect(router.state.location.search).toContain('expired=1');
    expect(queryClient.getQueryData(sessionKeys.me())).toBeNull();
    expect(socket.connected).toBe(false);
    expect(socket.connectCalls).toBe(0);
  });

  it('ignores handshake errors that are not about auth', async () => {
    let refreshes = 0;
    server.use(
      http.post('/v1/auth/refresh', ({ response }) => {
        refreshes += 1;
        return response(204).empty();
      }),
    );
    renderRoute('/progress');
    await screen.findByText('Advanced beginner · C3 Apply');
    await waitFor(() => {
      expect(openedSockets).toHaveLength(1);
    });
    act(() => {
      openedSockets[0]!.rejectHandshake(new Error('xhr poll error'));
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(refreshes).toBe(0);
    expect(openedSockets[0]!.connectCalls).toBe(0);
  });
});
