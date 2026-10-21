import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockPath, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

describe('/today (US-03 home)', () => {
  it('shows the active path’s current step, progress and what comes next', async () => {
    const { container } = renderRoute('/today');
    expect(await screen.findByRole('heading', { level: 2, name: mockPath.steps[1]!.objective })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Product Design (UI/UX)' })).toBeInTheDocument();
    expect(screen.getByText('1 of 6 steps done')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Continue: Step 2/ })).toHaveAttribute('href', '/steps/step-2?path=path-1');
    expect(screen.getByText(mockPath.steps[2]!.objective)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    await expectNoAxeViolations(container);
  });

  it('invites a learner without an active path to start one', async () => {
    server.use(http.get('/v1/paths', ({ response }) => response(200).json({ items: [], nextCursor: null })));
    const { container } = renderRoute('/today');
    expect(await screen.findByText('No active path yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a learning path' })).toHaveAttribute('href', '/start');
    await expectNoAxeViolations(container);
  });

  it('offers a retry when paths cannot load', { timeout: 10_000 }, async () => {
    server.use(http.get('/v1/paths', ({ response }) => response.untyped(problemResponse(mockProblem(500, 'INTERNAL', 'Boom')))));
    renderRoute('/today');
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 8000 })).toBeInTheDocument();
  });
});

describe('/paths', () => {
  it('lists paths with status and progress', async () => {
    const { container } = renderRoute('/paths');
    const link = await screen.findByRole('link', { name: /Product Design \(UI\/UX\)/ });
    expect(link).toHaveAttribute('href', '/paths/path-1');
    expect(link).toHaveTextContent('Active · Advanced beginner → Competent · 1 of 6 steps');
    await expectNoAxeViolations(container);
  });

  it('shows an empty state', async () => {
    server.use(http.get('/v1/paths', ({ response }) => response(200).json({ items: [], nextCursor: null })));
    renderRoute('/paths');
    expect(await screen.findByText('No paths yet')).toBeInTheDocument();
  });
});
