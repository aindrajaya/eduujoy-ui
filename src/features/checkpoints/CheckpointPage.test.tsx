import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockCheckpointFailed, mockCheckpointResult, mockPath, mockProblem } from '@/api/mocks/data';
import { http } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { sseResponse } from '@/api/mocks/sse';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

afterEach(() => {
  window.localStorage.clear();
});

const URL_STEP_2 = '/checkpoints/step-2?path=path-1';

/** Answers step 2's three questions and opens the review. */
async function answerAll(user: ReturnType<typeof userEvent.setup>, written = 'Interviews, because they explain why.') {
  await user.click(await screen.findByRole('radio', { name: 'Interviews' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByRole('checkbox', { name: 'Usability tests' }));
  await user.click(screen.getByRole('checkbox', { name: 'Contextual inquiry' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.type(screen.getByRole('textbox', { name: 'Your answer' }), written);
  await user.click(screen.getByRole('button', { name: 'Review answers' }));
  await screen.findByRole('heading', { name: 'Review your answers' });
}

describe('/checkpoints/:id (US-05)', () => {
  it('shows the checkpoint with its pass mark and rubric', async () => {
    const { container } = renderRoute(URL_STEP_2);
    expect(await screen.findByRole('heading', { level: 1, name: mockPath.steps[1]?.objective })).toBeInTheDocument();
    expect(screen.getByText('Step 2 checkpoint')).toBeInTheDocument();
    expect(screen.getByText('3 questions · pass mark 80%')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'A good written answer' })).toHaveTextContent('Names a method that fits');
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('open answers are graded over the job stream, then the result shows and the path refreshes', async () => {
    const user = userEvent.setup();
    let pathLoads = 0;
    server.use(
      http.get('/v1/paths/{id}', ({ response }) => {
        pathLoads += 1;
        return response(200).json(mockPath);
      }),
    );
    const { router, container } = renderRoute(URL_STEP_2);
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
    expect(await screen.findByRole('heading', { name: 'You passed this checkpoint' })).toHaveFocus();
    expect(router.state.location.search).toContain('job=grade-1');
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Next: Step 3/ })).toHaveAttribute('href', '/steps/step-3?path=path-1');
    await waitFor(() => {
      expect(pathLoads).toBe(2);
    });
    await expectNoAxeViolations(container);
  });

  it('shows answers as they are graded while the job runs', async () => {
    server.use(
      http.get('/v1/jobs/{id}/events', ({ response }) =>
        response.untyped(
          sseResponse([
            { id: '1', event: 'progress', data: { jobId: 'grade-1', stage: 'grade', done: 0, total: 1, message: 'Reading your answer' } },
            { id: '2', event: 'partial', data: { jobId: 'grade-1', kind: 'checkpoint_item', itemResult: mockCheckpointResult.items[2] } },
          ], { keepOpen: true }),
        ),
      ),
    );
    renderRoute(`${URL_STEP_2}&job=grade-1`);
    expect(await screen.findByRole('heading', { name: 'Grading your answers' })).toBeInTheDocument();
    expect((await screen.findByText(/Question 3:/)).closest('li')).toHaveTextContent('60%');
    expect(screen.getByText('Reading your answer')).toBeInTheDocument();
  });

  it('a choice-only attempt is graded at once; a fail offers a retry with a new attempt key', async () => {
    const user = userEvent.setup();
    const keys: (string | null)[] = [];
    server.use(
      http.post('/v1/checkpoints/{id}/submissions', ({ request, response }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return response(200).json(mockCheckpointFailed);
      }),
    );
    renderRoute(URL_STEP_2);
    await answerAll(user, 'Surveys');
    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
    expect(await screen.findByRole('heading', { name: 'Not passed yet' })).toBeInTheDocument();
    expect(screen.getByText('Surveys explain motivation')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Try again/ }));
    await answerAll(user, 'Interviews');
    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
    await screen.findByRole('heading', { name: 'Not passed yet' });
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('offline, the submit waits for the connection and then sends (US-05 offline submit)', async () => {
    const user = userEvent.setup();
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    let sent = 0;
    server.use(
      http.post('/v1/checkpoints/{id}/submissions', ({ response }) => {
        sent += 1;
        return response(200).json(mockCheckpointResult);
      }),
    );
    renderRoute(URL_STEP_2);
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
    expect(await screen.findByText(/You are offline/)).toBeInTheDocument();
    expect(sent).toBe(0);

    online.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
    expect(await screen.findByRole('heading', { name: 'You passed this checkpoint' })).toBeInTheDocument();
    expect(sent).toBe(1);
  });

  it('explains an AI-budget pause on submit', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/v1/checkpoints/{id}/submissions', ({ response }) =>
        response.untyped(
          new Response(JSON.stringify(mockProblem(503, 'AI_BUDGET_EXCEEDED', 'Paused')), {
            status: 503,
            // Contract 0.2.1: whole seconds until UTC midnight. The submit must not wait it out.
            headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '18000' },
          }),
        ),
      ),
    );
    renderRoute(URL_STEP_2);
    await answerAll(user);
    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Grading has reached today’s limit. Your answers are saved on this device; submit them again in about 5 hours.');
  });

  it('explains a grading job that failed and offers a retry when it is retryable', async () => {
    server.use(
      http.get('/v1/jobs/{id}/events', ({ response }) =>
        response.untyped(
          sseResponse([
            {
              id: '1',
              event: 'failed',
              data: { jobId: 'grade-1', retryable: true, problem: mockProblem(503, 'AI_BUDGET_EXCEEDED', 'Paused') },
            },
          ]),
        ),
      ),
    );
    renderRoute(`${URL_STEP_2}&job=grade-1`);
    expect(await screen.findByText('We couldn’t grade your answers')).toBeInTheDocument();
    expect(screen.getByText(/after the daily reset at midnight UTC/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Question 1 of 3')).toBeInTheDocument();
  });

  it('a locked step’s checkpoint is not open yet; an unknown one is not found', async () => {
    const { unmount } = renderRoute('/checkpoints/step-3?path=path-1');
    expect(await screen.findByText('This checkpoint is not open yet')).toBeInTheDocument();
    unmount();
    renderRoute('/checkpoints/nope?path=path-1');
    expect(await screen.findByText('Checkpoint not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to path' })).toHaveAttribute('href', '/paths/path-1');
  });
});
