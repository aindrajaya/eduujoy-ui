import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockMe } from '@/api/mocks/data';
import { http } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { queryClient } from '@/query-client';
import { expectNoAxeViolations } from '@/test/axe';
import { openedSockets } from '@/test/fakeSocket';
import { renderRoute, mockSignedOut } from '@/test/render';

describe('/account', () => {
  it('shows the signed-in user in the tabs layout', async () => {
    const { container } = renderRoute('/account');
    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByText(mockMe.user.email)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('region', { name: 'Your plan' })).toHaveTextContent('Free');
    await expectNoAxeViolations(container);
  });

  it('falls back to the email name when the user has no name', async () => {
    server.use(
      http.get('/v1/auth/me', ({ response }) =>
        response(200).json({ ...mockMe, user: { ...mockMe.user, name: null } }),
      ),
    );
    renderRoute('/account');
    expect(await screen.findByRole('heading', { name: 'jane.doe' })).toBeInTheDocument();
  });

  it('signs out, clears the cache and replaces the page with /signin', async () => {
    let loggedOut = false;
    server.use(
      http.post('/v1/auth/logout', ({ response }) => {
        loggedOut = true;
        mockSignedOut();
        return response(204).empty();
      }),
    );
    const { router } = renderRoute('/account');
    const signOutButton = await screen.findByRole('button', { name: 'Sign out' });
    await waitFor(
      () => {
        expect(openedSockets).toHaveLength(1);
      },
      { timeout: 3000 },
    );
    await userEvent.click(signOutButton);
    await screen.findByRole('heading', { name: 'Welcome back' });
    expect(loggedOut).toBe(true);
    expect(router.state.location.pathname).toBe('/signin');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(queryClient.getQueryData(['auth', 'me'])).toBeNull();
    // The realtime socket closes with the signed-in screens.
    expect(openedSockets.at(-1)?.connected).toBe(false);
  });

  it('offline sign-out: clears the cache, says they may still be signed in, and offers a retry', { timeout: 10_000 }, async () => {
    let online = false;
    let calls = 0;
    server.use(
      http.post('/v1/auth/logout', ({ response }) => {
        calls += 1;
        if (!online) return response.untyped(Response.error());
        mockSignedOut();
        return response(204).empty();
      }),
    );
    const { router, container } = renderRoute('/account');
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(alert).toHaveTextContent("We couldn't reach the server. You may still be signed in on this device.");
    expect(router.state.location.pathname).toBe('/signin');
    expect(calls).toBe(3);
    expect(queryClient.getQueryData(['auth', 'me'])).toBeNull();
    await expectNoAxeViolations(container);

    online = true;
    await userEvent.click(screen.getByRole('button', { name: 'Try signing out again' }));
    expect(await screen.findByText('You are signed out.')).toBeInTheDocument();
    expect(calls).toBe(4);
  });
});
