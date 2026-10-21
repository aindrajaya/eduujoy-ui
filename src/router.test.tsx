import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockProblem } from './api/mocks/data';
import { http, problemResponse } from './api/mocks/handlers';
import { server } from './api/mocks/server';
import { routes } from './router';
import { renderRoute, mockSignedOut } from './test/render';

describe('router', () => {
  it('loads every screen lazily (no static Component or element)', () => {
    const walk = (list: typeof routes): boolean =>
      list.every(
        (r) => !r.Component && !r.element && (r.children ? walk(r.children) : Boolean(r.lazy) || Boolean(r.index)),
      );
    expect(walk(routes)).toBe(true);
  });

  it('renders the not-found screen for unknown paths', async () => {
    renderRoute('/nope');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('sends / to /today when signed in and /signin when signed out', async () => {
    const signedIn = renderRoute('/');
    await screen.findByRole('navigation', { name: 'Main' });
    expect(signedIn.router.state.location.pathname).toBe('/today');
    signedIn.unmount();

    mockSignedOut();
    const signedOut = renderRoute('/');
    await screen.findByRole('heading', { name: 'Welcome back' });
    expect(signedOut.router.state.location.pathname).toBe('/signin');
  });

  it.each(['/today', '/steps/1', '/start', '/account'])(
    'redirects a signed-out visit to %s through /signin with next',
    async (path) => {
      mockSignedOut();
      const { router } = renderRoute(path);
      await screen.findByRole('heading', { name: 'Welcome back' });
      expect(router.state.location.pathname).toBe('/signin');
      expect(router.state.location.search).toBe(`?next=${encodeURIComponent(path)}`);
    },
  );

  it('shows only the boot splash until auth/me resolves', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get('/v1/auth/me', async ({ response }) => {
        await gate;
        return response.untyped(problemResponse(mockProblem(401, 'UNAUTHENTICATED', 'Sign in')));
      }),
    );
    renderRoute('/today');
    expect(await screen.findByRole('status', { name: 'Loading Eduujoy' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    release();
    mockSignedOut();
    await screen.findByRole('heading', { name: 'Welcome back' });
  });

  it('keeps signed-in users away from /signin', async () => {
    const { router } = renderRoute('/signin?next=%2Fprogress');
    await screen.findByRole('heading', { level: 1, name: 'Progress' });
    expect(router.state.location.pathname).toBe('/progress');
  });

  // The session query retries network errors twice (1 s, then 2 s) before the error shows.
  it('shows a retryable error when the API is unreachable', { timeout: 10_000 }, async () => {
    server.use(http.get('/v1/auth/me', ({ response }) => response.untyped(Response.error())));
    renderRoute('/today');
    expect(
      await screen.findByRole('heading', { name: 'Can’t reach Eduujoy' }, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
