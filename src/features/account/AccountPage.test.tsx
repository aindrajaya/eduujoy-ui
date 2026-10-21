import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockMe } from '@/api/mocks/data';
import { http } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { queryClient } from '@/query-client';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute, mockSignedOut } from '@/test/render';

describe('/account', () => {
  it('shows the signed-in user in the tabs layout', async () => {
    const { container } = renderRoute('/account');
    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByText(mockMe.user.email)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('aria-current', 'page');
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
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    await screen.findByRole('heading', { name: 'Welcome back' });
    expect(loggedOut).toBe(true);
    expect(router.state.location.pathname).toBe('/signin');
    expect(router.state.historyAction).toBe('REPLACE');
    expect(queryClient.getQueryData(['auth', 'me'])).toBeNull();
  });
});
