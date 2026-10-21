import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { getMe } from '@/api/endpoints/auth';
import { getPath } from '@/api/endpoints/paths';
import { mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { queryClient } from '@/query-client';
import { mockSignedOut, renderRoute } from '@/test/render';
import { installSessionExpiry } from './session-expiry';

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
});

describe('installSessionExpiry', () => {
  it('sends the learner to /signin with next and the expired notice after a failed refresh', async () => {
    const { router } = renderRoute('/steps/2?tab=resources');
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

    expect(await screen.findByRole('status')).toHaveTextContent('Your session expired.');
    expect(router.state.location.pathname).toBe('/signin');
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe('/steps/2?tab=resources');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(queryClient.getQueryData(['paths', 'detail', 'path-1'])).toBeUndefined();
  });

  it('ignores auth/me failures, which the route guards handle', async () => {
    const { router } = renderRoute('/today');
    await screen.findByRole('navigation', { name: 'Main' });
    uninstall = installSessionExpiry(router, queryClient);
    mockSignedOut();
    await expect(getMe()).rejects.toMatchObject({ status: 401 });
    expect(router.state.location.pathname).toBe('/today');
  });
});
