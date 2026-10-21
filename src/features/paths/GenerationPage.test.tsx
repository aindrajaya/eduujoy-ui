import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { mockPathJobEvents, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { sseResponse, type MockSseEvent } from '@/api/mocks/sse';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

const events = mockPathJobEvents as unknown as MockSseEvent[];

afterEach(() => {
  window.localStorage.clear();
});

describe('/paths/new/:jobId (US-03 generation)', () => {
  it('shows staged progress, announces it, previews steps and can be left', async () => {
    // Stop before "completed" so the screen stays up.
    server.use(http.get('/v1/jobs/{id}/events', ({ response }) => response.untyped(sseResponse(events.slice(0, 3), { keepOpen: true }))));
    const { container } = renderRoute('/paths/new/job-1');
    expect(await screen.findByText('Analysing videos, 4 of 6')).toHaveAttribute('role', 'status');
    expect(screen.getByText('Finding resources').parentElement).toHaveTextContent('(done)');
    expect(screen.getByText('Analysing resources').parentElement).toHaveTextContent('4 of 6');
    expect(screen.getByRole('heading', { name: 'Your first steps' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Keep exploring while we build' })).toHaveAttribute('href', '/today');
    await expectNoAxeViolations(container);
  });

  it('when the path is ready, opens it with a toast', async () => {
    const { router } = renderRoute('/paths/new/job-1');
    expect(await screen.findByText('Your path is ready')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/paths/path-1');
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('explains a failed build', async () => {
    server.use(
      http.get('/v1/jobs/{id}/events', ({ response }) =>
        response.untyped(
          sseResponse([
            events[0]!,
            { id: '2', event: 'failed', data: { jobId: 'job-1', retryable: true, problem: mockProblem(500, 'INTERNAL', 'Boom') } },
          ]),
        ),
      ),
    );
    const { container } = renderRoute('/paths/new/job-1');
    expect(await screen.findByText('We couldn’t build your path')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try again from your topic' })).toHaveAttribute('href', '/start');
    await expectNoAxeViolations(container);
  });

  it('explains an unknown job', async () => {
    server.use(
      http.get('/v1/jobs/{id}/events', ({ response }) =>
        response.untyped(problemResponse(mockProblem(404, 'NOT_FOUND', 'No job'))),
      ),
    );
    renderRoute('/paths/new/unknown');
    expect(await screen.findByText('This build is no longer available.')).toBeInTheDocument();
  });
});
