import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('lets a signed-in user sign in again when asked to (reauth=1, contract 0.6.0)', async () => {
    const { router } = renderRoute('/signin?next=%2Faccount%3Fdelete%3D1&reauth=1');
    expect(await screen.findByText('For your security, sign in again to delete your account.')).toBeInTheDocument();
    // Give the session time to resolve signed in; the page must not redirect.
    await screen.findByRole('heading', { name: 'Welcome back' });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(router.state.location.pathname).toBe('/signin');

    await userEvent.type(screen.getByLabelText('Email'), 'jane.doe@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => {
      expect(router.state.location.pathname + router.state.location.search).toBe('/account?delete=1');
    });
  });

  it('keeps signed-in users away from /signin', async () => {
    const { router } = renderRoute('/signin?next=%2Fprogress');
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/progress');
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Progress' })).toBeInTheDocument();
  });

  // The session query retries network errors twice (1 s, then 2 s) before the error shows.
  it('shows a retryable error when the API is unreachable', async () => {
    server.use(http.get('/v1/auth/me', ({ response }) => response.untyped(Response.error())));
    renderRoute('/today');
    expect(
      await screen.findByRole('heading', { name: 'Can’t reach Eduujoy' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
