import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getMe } from '@/api/endpoints/auth';
import { getPath } from '@/api/endpoints/paths';
import { mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { queryClient } from '@/query-client';
import { mockSignedOut, renderRoute } from '@/test/render';
import { sessionKeys } from './session';
import { installSessionExpiry } from './session-expiry';

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
});

describe('installSessionExpiry', () => {
  it('sends the learner to /signin with next and the expired notice after a failed refresh', async () => {
    const { router } = renderRoute('/steps/step-2?path=path-1&tab=resources');
    await screen.findByRole('heading', { level: 1 });
    uninstall = installSessionExpiry(router, queryClient);
    queryClient.setQueryData(['paths', 'detail', 'path-1'], { cached: true });

    server.use(
      http.get('/v1/paths/{id}', ({ response }) =>
        response.untyped(problemResponse(mockProblem(401, 'UNAUTHENTICATED', 'Expired'))),
      ),
    );
    mockSignedOut();
    await expect(getPath('path-1')).rejects.toMatchObject({ status: 401 });

    expect((await screen.findByText(/Your session expired/)).closest('[role="status"]')).not.toBeNull();
    expect(router.state.location.pathname).toBe('/signin');
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe('/steps/step-2?path=path-1&tab=resources');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(queryClient.getQueryData(['paths', 'detail', 'path-1'])).toBeUndefined();
  });

  it('redirects when auth/me settles on signed out while a protected screen is idle', async () => {
    const { router } = renderRoute('/account#plan');
    await screen.findByRole('heading', { name: 'Jane Doe' });
    uninstall = installSessionExpiry(router, queryClient);

    mockSignedOut();
    await queryClient.refetchQueries({ queryKey: sessionKeys.me() });

    expect((await screen.findByText(/Your session expired/)).closest('[role="status"]')).not.toBeNull();
    expect(router.state.location.pathname).toBe('/signin');
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe('/account#plan');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('ignores manual writes, so a deliberate sign-out shows no expired notice', async () => {
    const { router } = renderRoute('/account');
    await screen.findByRole('heading', { name: 'Jane Doe' });
    uninstall = installSessionExpiry(router, queryClient);
    queryClient.setQueryData(sessionKeys.me(), null);
    expect(router.state.location.pathname).toBe('/account');
  });

  it('does nothing on public pages, where signed out is expected', async () => {
    mockSignedOut();
    const { router } = renderRoute('/signin');
    await screen.findByRole('heading', { name: 'Welcome back' });
    uninstall = installSessionExpiry(router, queryClient);
    await queryClient.refetchQueries({ queryKey: sessionKeys.me() });
    expect(router.state.location.search).toBe('');
  });

  it('ignores a bare auth/me 401 outside the session query', async () => {
    const { router } = renderRoute('/today');
    await screen.findByRole('navigation', { name: 'Main' });
    uninstall = installSessionExpiry(router, queryClient);
    mockSignedOut();
    await expect(getMe()).rejects.toMatchObject({ status: 401 });
    expect(router.state.location.pathname).toBe('/today');
  });
});
