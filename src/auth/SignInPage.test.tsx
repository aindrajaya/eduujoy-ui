import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockMe, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { expectNoAxeViolations } from '@/test/axe';
import { createTestQueryClient } from '@/test/providers';
import { mockSignedOut } from '@/test/render';
import { sessionKeys } from './session';
import SignInPage from './SignInPage';

function renderSignIn(path = '/signin') {
  const client = createTestQueryClient();
  const router = createMemoryRouter(
    [
      { path: '/signin', Component: SignInPage },
      { path: '/signup', element: <h1>Sign up</h1> },
      { path: '*', element: <h1>Landed</h1> },
    ],
    { initialEntries: [path] },
  );
  const view = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { client, router, ...view };
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('SignInPage', () => {
  // These screens render without waiting for auth/me; the baseline visitor is signed out.
  beforeEach(() => {
    mockSignedOut();
  });

  it('renders an accessible form with Google and sign-up links', async () => {
    const { container } = renderSignIn('/signin?next=%2Fsteps%2F2');
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continue with google/i })).toHaveAttribute(
      'href',
      'http://localhost:3000/v1/auth/google?returnTo=%2Fsteps%2F2',
    );
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/signup?next=%2Fsteps%2F2',
    );
    await expectNoAxeViolations(container);
  });

  it('validates on submit without calling the API', async () => {
    const { container } = renderSignIn();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your email address')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('focuses the first invalid field, then re-validates while typing', async () => {
    renderSignIn();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    const email = screen.getByLabelText('Email');
    await waitFor(() => {
      expect(email).toHaveFocus();
    });
    expect(email).toHaveAccessibleDescription('Enter your email address');
    await user.type(email, 'not-an-email');
    await waitFor(() => {
      expect(email).toHaveAccessibleDescription('Enter a valid email address');
    });
    await user.type(email, '@example.com');
    await waitFor(() => {
      expect(email).not.toHaveAccessibleDescription();
    });
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Enter your password');
  });

  it('signs in, caches the session and goes to next', async () => {
    const { client, router } = renderSignIn('/signin?next=%2Fprogress');
    await fillAndSubmit('jane@example.com', 'correct-horse');
    expect(await screen.findByRole('heading', { name: 'Landed' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/progress');
    expect(client.getQueryData(sessionKeys.me())).toEqual(mockMe);
  });

  it('ignores an unsafe next and lands on /today', async () => {
    const { router } = renderSignIn('/signin?next=https%3A%2F%2Fevil.example');
    await fillAndSubmit('jane@example.com', 'correct-horse');
    await screen.findByRole('heading', { name: 'Landed' });
    expect(router.state.location.pathname).toBe('/today');
  });

  it('shows wrong-credential and rate-limit errors', async () => {
    server.use(
      http.post('/v1/auth/login', ({ response }) =>
        response.untyped(problemResponse(mockProblem(401, 'UNAUTHENTICATED', 'Invalid'))),
      ),
    );
    const { container } = renderSignIn();
    await fillAndSubmit('jane@example.com', 'wrong-password');
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
    await expectNoAxeViolations(container);

    server.use(
      http.post('/v1/auth/login', ({ response }) =>
        response.untyped(
          problemResponse(mockProblem(429, 'RATE_LIMITED', 'Slow down'), { 'Retry-After': '30' }),
        ),
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Too many attempts. Try again in 30 seconds.')).toBeInTheDocument();
  });

  it('maps server field errors onto the fields', async () => {
    server.use(
      http.post('/v1/auth/login', ({ response }) =>
        response.untyped(
          problemResponse(
            mockProblem(400, 'VALIDATION_FAILED', 'Invalid', {
              errors: [{ field: 'email', message: 'This email domain is not allowed' }],
            }),
          ),
        ),
      ),
    );
    renderSignIn();
    await fillAndSubmit('jane@example.com', 'whatever-pass');
    expect(await screen.findByLabelText('Email')).toHaveAccessibleDescription(
      'This email domain is not allowed',
    );
  });

  it('shows the session-expired notice', async () => {
    renderSignIn('/signin?expired=1&next=%2Ftoday');
    expect(await screen.findByRole('status')).toHaveTextContent('Your session expired.');
  });

  it('renders the form at once, before auth/me answers', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    server.use(
      http.get('/v1/auth/me', async ({ response }) => {
        await gate;
        return response(200).json(mockMe);
      }),
    );
    const { router } = renderSignIn('/signin?next=%2Fpaths');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    release();
    // Once the session resolves signed in, the visitor is sent on to next.
    await screen.findByRole('heading', { name: 'Landed' });
    expect(router.state.location.pathname).toBe('/paths');
    expect(router.state.historyAction).toBe('REPLACE');
  });
});
