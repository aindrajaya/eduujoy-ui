import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockProblem, mockProgress } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

const second = {
  ...mockProgress.items[0]!,
  topic: { id: 'topic-sql', canonicalName: 'SQL for analysts' },
  position: { stage: 'novice' as const, bloom: 'C1' as const },
  activePathId: null,
};

describe('/progress (US-09)', () => {
  it('shows the position, the grid with history, and how the learner moved', async () => {
    const { container } = renderRoute('/progress');
    expect(await screen.findByRole('heading', { level: 2, name: 'Product Design (UI/UX)' })).toBeInTheDocument();
    expect(screen.getByText('Advanced beginner · C3 Apply')).toBeInTheDocument();
    expect(screen.getByText(/Confidence 78% · from a checkpoint/)).toBeInTheDocument();
    const table = screen.getByRole('table', { name: /your position/ });
    expect(within(table).getByText('You are here')).toBeInTheDocument();
    expect(await within(table).findByText(/^Earlier:/)).toBeInTheDocument();
    const moves = within(screen.getByRole('region', { name: 'How you moved' })).getAllByRole('listitem');
    expect(moves[0]).toHaveTextContent('C3 Apply · from a checkpoint');
    expect(moves[1]).toHaveTextContent('C2 Understand · from the diagnostic');
    expect(screen.getByRole('link', { name: /Continue your path/ })).toHaveAttribute('href', '/paths/path-1');
    await expectNoAxeViolations(container);
  });

  it('switches between topics', async () => {
    server.use(http.get('/v1/progress', ({ response }) => response(200).json({ items: [...mockProgress.items, second] })));
    const { router } = renderRoute('/progress');
    await userEvent.click(await screen.findByRole('button', { name: 'SQL for analysts' }));
    // setSearchParams navigates asynchronously.
    expect(await screen.findByRole('heading', { level: 2, name: 'SQL for analysts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SQL for analysts' })).toHaveAttribute('aria-current', 'true');
    expect(router.state.location.search).toBe('?topic=topic-sql');
    expect(screen.queryByRole('link', { name: /Continue your path/ })).not.toBeInTheDocument();
  });

  it('invites a learner with no progress to start', async () => {
    server.use(http.get('/v1/progress', ({ response }) => response(200).json({ items: [] })));
    renderRoute('/progress');
    expect(await screen.findByText('No progress yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a learning path' })).toHaveAttribute('href', '/start');
  });

  it('until the API serves progress (A11), a 404 says when the grid appears instead of an error', async () => {
    let calls = 0;
    server.use(
      http.get('/v1/progress', ({ response }) => {
        calls += 1;
        return response.untyped(problemResponse(mockProblem(404, 'NOT_FOUND', 'Not Found')));
      }),
    );
    const { container } = renderRoute('/progress');
    expect(await screen.findByText('Your progress grid appears after your first path')).toBeInTheDocument();
    expect(screen.queryByText('Could not load your progress')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(calls).toBe(1);
    await expectNoAxeViolations(container);
  });

  it('any other failure keeps the error and its retry', async () => {
    server.use(
      http.get('/v1/progress', ({ response }) => response.untyped(problemResponse(mockProblem(500, 'INTERNAL', 'Boom')))),
    );
    renderRoute('/progress');
    expect(await screen.findByText('Could not load your progress')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
