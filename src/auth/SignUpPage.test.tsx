import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockMe, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import type { RegisterRequest } from '@/api/types';
import { expectNoAxeViolations } from '@/test/axe';
import { createTestQueryClient } from '@/test/providers';
import { mockSignedOut } from '@/test/render';
import SignUpPage from './SignUpPage';

function renderSignUp(path = '/signup') {
  const router = createMemoryRouter(
    [
      { path: '/signup', Component: SignUpPage },
      { path: '*', element: <h1>Landed</h1> },
    ],
    { initialEntries: [path] },
  );
  const view = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, ...view };
}

describe('SignUpPage', () => {
  // These screens render without waiting for auth/me; the baseline visitor is signed out.
  beforeEach(() => {
    mockSignedOut();
  });

  it('enforces the 10-character password minimum', async () => {
    const { container } = renderSignUp();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByLabelText('Password')).toHaveAccessibleDescription('Use at least 10 characters');
    await expectNoAxeViolations(container);
  });

  it('creates the account without an empty name and starts onboarding', async () => {
    let body: RegisterRequest | undefined;
    server.use(
      http.post('/v1/auth/register', async ({ request, response }) => {
        body = await request.json();
        return response(201).json({
          user: { id: 'u2', email: body.email, locale: 'en' },
          roles: ['learner'],
          plan: 'free',
          quota: { credits: 0, monthlyPaths: 1, usedPaths: 0, periodEnd: '2026-11-21T00:00:00Z' },
        });
      }),
    );
    const { router } = renderSignUp();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'long-enough-pw');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByRole('heading', { name: 'Landed' });
    expect(router.state.location.pathname).toBe('/start');
    expect(body).toEqual({ email: 'new@example.com', password: 'long-enough-pw' });
  });

  it('explains a taken email', async () => {
    server.use(
      http.post('/v1/auth/register', ({ response }) =>
        response.untyped(problemResponse(mockProblem(409, 'EMAIL_TAKEN', 'Email taken'))),
      ),
    );
    const { container } = renderSignUp('/signup?next=%2Fpaths');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Name (optional)'), 'Jane');
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'long-enough-pw');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin?next=%2Fpaths');
    await expectNoAxeViolations(container);
  });

  it('sends an already signed-in visitor to Today, not onboarding', async () => {
    server.use(http.get('/v1/auth/me', ({ response }) => response(200).json(mockMe)));
    const { router } = renderSignUp();
    await screen.findByRole('heading', { name: 'Landed' });
    expect(router.state.location.pathname).toBe('/today');
  });
});
