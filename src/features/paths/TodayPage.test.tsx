import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockPath, mockPathSummary, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import type { PathSummary } from '@/api/types';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

describe('/today (US-03 home)', () => {
  it('shows the active path’s current step, progress and what comes next', async () => {
    const { container } = renderRoute('/today');
    expect(await screen.findByRole('heading', { level: 2, name: mockPath.steps[1]!.objective })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Product Design (UI/UX)' })).toBeInTheDocument();
    expect(screen.getByText('1 of 6 steps done')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Continue: Step 2/ })).toHaveAttribute('href', '/steps/step-2?path=path-1');
    expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    await expectNoAxeViolations(container);
  });

  it('renders from the list alone (contract 0.3.0), then fetches the path for the next tap', async () => {
    let detailLoads = 0;
    server.use(
      http.get('/v1/paths/{id}', ({ response }) => {
        detailLoads += 1;
        return response(200).json(mockPath);
      }),
    );
    renderRoute('/today');
    expect(await screen.findByRole('heading', { level: 2, name: mockPath.steps[1]!.objective })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Continue: Step 2/ })).toBeInTheDocument();
    // The idle prefetch (setTimeout in jsdom) loads the detail off the critical path.
    await waitFor(() => {
      expect(detailLoads).toBe(1);
    });
  });

  it('falls back to the path detail when the list has no currentStep (older API)', async () => {
    const withoutStep: PathSummary = { ...mockPathSummary };
    delete withoutStep.currentStep;
    server.use(http.get('/v1/paths', ({ response }) => response(200).json({ items: [withoutStep], nextCursor: null })));
    renderRoute('/today');
    expect(await screen.findByRole('heading', { level: 2, name: mockPath.steps[1]!.objective })).toBeInTheDocument();
  });

  it('says so when every step is done (currentStep null)', async () => {
    server.use(
      http.get('/v1/paths', ({ response }) => response(200).json({ items: [{ ...mockPathSummary, currentStep: null }], nextCursor: null })),
    );
    renderRoute('/today');
    expect(await screen.findByText('You finished every step')).toBeInTheDocument();
  });

  it('says path building opens soon when GET /v1/paths is not live yet (404), with no error or retry', async () => {
    server.use(http.get('/v1/paths', ({ response }) => response.untyped(problemResponse(mockProblem(404, 'NOT_FOUND', 'Not Found')))));
    const { container } = renderRoute('/today');
    expect(await screen.findByText('Your first path will appear here once path building opens')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'See your placement' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('invites a learner without an active path to start one', async () => {
    server.use(http.get('/v1/paths', ({ response }) => response(200).json({ items: [], nextCursor: null })));
    const { container } = renderRoute('/today');
    expect(await screen.findByText('No active path yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start a learning path' })).toHaveAttribute('href', '/start');
    await expectNoAxeViolations(container);
  });

  it('offers a retry when paths cannot load', async () => {
    server.use(http.get('/v1/paths', ({ response }) => response.untyped(problemResponse(mockProblem(500, 'INTERNAL', 'Boom')))));
    renderRoute('/today');
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('/paths', () => {
  it('lists paths with status and progress', async () => {
    const { container } = renderRoute('/paths');
    const link = await screen.findByRole('link', { name: /Product Design \(UI\/UX\)/ });
    expect(link).toHaveAttribute('href', '/paths/path-1');
    expect(link).toHaveTextContent('ActiveAdvanced beginner → Competent · 1 of 6 steps');
    await expectNoAxeViolations(container);
  });

  it('says path building opens soon on a 404 from GET /v1/paths', async () => {
    server.use(http.get('/v1/paths', ({ response }) => response.untyped(problemResponse(mockProblem(404, 'NOT_FOUND', 'Not Found')))));
    renderRoute('/paths');
    expect(await screen.findByText('Your first path will appear here once path building opens')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    server.use(http.get('/v1/paths', ({ response }) => response(200).json({ items: [], nextCursor: null })));
    renderRoute('/paths');
    expect(await screen.findByText('No paths yet')).toBeInTheDocument();
  });
});
