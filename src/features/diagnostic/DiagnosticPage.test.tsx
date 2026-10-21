import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { mockDiagnosticCompleted, mockDiagnosticResume, mockJobAccepted, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import type { DiagnosticAnswersRequest } from '@/api/types';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

afterEach(() => {
  window.localStorage.clear();
});

async function answerResumedBatch() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('radio', { name: 'Contextual interviews with recent abandoners' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.type(screen.getByRole('textbox', { name: 'Your answer' }), 'Visibility of system status');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  return user;
}

describe('/diagnostic/:id (US-02)', () => {
  it('resumes the outstanding batch after a reload, with overall progress', async () => {
    const { container } = renderRoute('/diagnostic/diag-1');
    expect(await screen.findByText('Question 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('0 of about 12 answered')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Diagnostic progress' })).toHaveAttribute('aria-valuenow', '0');
    await expectNoAxeViolations(container);
  });

  it('submits the batch after its last answer and shows the placement', { timeout: 10_000 }, async () => {
    let body: DiagnosticAnswersRequest | undefined;
    server.use(
      http.post('/v1/diagnostics/{id}/answers', async ({ request, response }) => {
        body = await request.json();
        return response(200).json(mockDiagnosticCompleted);
      }),
    );
    const { container } = renderRoute('/diagnostic/diag-1');
    await answerResumedBatch();
    expect(await screen.findByRole('heading', { name: /You’re at Advanced beginner in Product Design/ })).toBeInTheDocument();
    expect(body?.answers).toEqual([
      { itemId: 'q1', skipped: false, optionIds: ['b'] },
      { itemId: 'q2', skipped: false, text: 'Visibility of system status' },
    ]);
    await expectNoAxeViolations(container);
  });

  it('skipped items are sent as skipped', { timeout: 10_000 }, async () => {
    let body: DiagnosticAnswersRequest | undefined;
    server.use(
      http.post('/v1/diagnostics/{id}/answers', async ({ request, response }) => {
        body = await request.json();
        return response(200).json(mockDiagnosticCompleted);
      }),
    );
    renderRoute('/diagnostic/diag-1');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Skip' }));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await screen.findByRole('heading', { name: /You’re at/ });
    expect(body?.answers.every((a) => a.skipped)).toBe(true);
  });

  it('builds the path and hands off to /paths/new/:jobId', { timeout: 10_000 }, async () => {
    server.use(http.get('/v1/diagnostics/{id}', ({ response }) => response(200).json({ ...mockDiagnosticResume, ...mockDiagnosticCompleted, items: [] })));
    const { router } = renderRoute('/diagnostic/diag-1');
    await userEvent.click(await screen.findByRole('button', { name: 'Build my path' }));
    expect(await screen.findByRole('heading', { name: 'Building your path…' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/paths/new/${mockJobAccepted.jobId}`);
  });

  it('explains a quota error when building the path', async () => {
    server.use(
      http.get('/v1/diagnostics/{id}', ({ response }) => response(200).json({ ...mockDiagnosticResume, ...mockDiagnosticCompleted, items: [] })),
      http.post('/v1/paths', ({ response }) =>
        response.untyped(problemResponse(mockProblem(402, 'QUOTA_EXCEEDED', 'Quota exceeded'))),
      ),
    );
    renderRoute('/diagnostic/diag-1');
    await userEvent.click(await screen.findByRole('button', { name: 'Build my path' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('You have used this month’s paths.');
  });

  it('explains when the diagnostic is not available', async () => {
    const { container } = renderRoute('/diagnostic/unknown');
    expect(await screen.findByText('This diagnostic isn’t available here')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start again' })).toHaveAttribute('href', '/start');
    await expectNoAxeViolations(container);
  });

  it('offers a retry when loading fails', { timeout: 10_000 }, async () => {
    server.use(
      http.get('/v1/diagnostics/{id}', ({ response }) =>
        response.untyped(problemResponse(mockProblem(500, 'INTERNAL', 'Boom'))),
      ),
    );
    renderRoute('/diagnostic/diag-1');
    expect(await screen.findByRole('button', { name: 'Try again' }, { timeout: 8000 })).toBeInTheDocument();
  });
});
