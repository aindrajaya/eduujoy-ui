import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { sessionKeys } from '@/auth/session';
import { queryClient } from '@/query-client';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

const dialog = () => screen.getByRole('dialog', { name: 'Delete your account?' });

describe('/account delete (contract 0.6.0)', () => {
  it('asks first; cancel keeps the account, confirm deletes it and signs out', async () => {
    let deletes = 0;
    server.use(
      http.delete('/v1/me', ({ response }) => {
        deletes += 1;
        return response(204).empty();
      }),
    );
    const { router, container } = renderRoute('/account');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }));
    expect(within(dialog()).getByRole('button', { name: 'Keep my account' })).toHaveFocus();
    await expectNoAxeViolations(container);
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Keep my account' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(deletes).toBe(0);

    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete my account' }));
    expect(await screen.findByText('Your account and personal data have been deleted.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/signin');
    expect(deletes).toBe(1);
    expect(queryClient.getQueryData(sessionKeys.me())).toBeNull();
  });

  it('REAUTH_REQUIRED sends the learner to sign in again (no refresh), then back to confirm', async () => {
    let refreshes = 0;
    server.use(
      http.delete('/v1/me', ({ response }) =>
        response.untyped(problemResponse(mockProblem(401, 'REAUTH_REQUIRED', 'Sign in again'))),
      ),
      http.post('/v1/auth/refresh', ({ response }) => {
        refreshes += 1;
        return response(204).empty();
      }),
    );
    const { router } = renderRoute('/account');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete my account' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/signin');
    });
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe('/account?delete=1');
    expect(new URLSearchParams(router.state.location.search).get('reauth')).toBe('1');
    expect(await screen.findByText('For your security, sign in again to delete your account.')).toBeInTheDocument();
    expect(refreshes).toBe(0);
  });

  it('back from signing in again, the confirmation reopens and deleting works', async () => {
    const { router } = renderRoute('/account?delete=1');
    expect(await within(await screen.findByRole('dialog')).findByText('You signed in again. Confirm to delete your account.')).toBeInTheDocument();
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete my account' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/signin');
    });
  });

  it('closing the reopened confirmation drops ?delete=1', async () => {
    const { router } = renderRoute('/account?delete=1');
    await userEvent.click(await within(await screen.findByRole('dialog')).findByRole('button', { name: 'Keep my account' }));
    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
  });

  it('a failed delete says nothing was deleted and keeps the learner signed in', async () => {
    server.use(
      http.delete('/v1/me', ({ response }) => response.untyped(problemResponse(mockProblem(500, 'INTERNAL', 'Boom')))),
    );
    const { router } = renderRoute('/account');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Delete my account' }));
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('Nothing was deleted');
    expect(router.state.location.pathname).toBe('/account');
  });
});
