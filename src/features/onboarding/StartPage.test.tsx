import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockDiagnosticBatch, mockProblem, mockTopic } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import type { DiagnosticStartRequest, TopicResolveRequest } from '@/api/types';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

const choices = [
  { id: 'java-lang', canonicalName: 'Java (programming language)', similarity: 0.84 },
  { id: 'javascript', canonicalName: 'JavaScript', similarity: 0.8 },
];

/** Skips the welcome splash and waits for the intake form. */
async function openForm(path = '/start') {
  const user = userEvent.setup();
  const view = renderRoute(path);
  await user.click(await screen.findByRole('button', { name: /get started/i }));
  await waitForElementToBeRemoved(() => screen.queryByRole('heading', { name: /welcome to eduujoy/i }), {
    timeout: 5000,
  });
  return { user, ...view };
}

async function submitIntake(user: ReturnType<typeof userEvent.setup>, topic = 'ux research') {
  await user.type(screen.getByLabelText('What do you want to learn?'), topic);
  await user.type(screen.getByLabelText("What's your goal?"), 'Run usability studies');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
}

function capture() {
  const sent: { resolve?: TopicResolveRequest; start?: DiagnosticStartRequest } = {};
  server.use(
    http.post('/v1/diagnostics', async ({ request, response }) => {
      sent.start = await request.json();
      return response(201).json(mockDiagnosticBatch);
    }),
  );
  return sent;
}

describe('/start (US-01)', () => {
  it('a matched topic starts the diagnostic and hands off to /diagnostic/:id', { timeout: 15_000 }, async () => {
    const sent = capture();
    server.use(
      http.post('/v1/topics/resolve', async ({ request, response }) => {
        sent.resolve = await request.json();
        return response(200).json({ status: 'matched', topic: mockTopic });
      }),
    );
    const { user, router, container } = await openForm();
    expect(screen.getByLabelText('Hours per week')).toHaveValue(3);
    await expectNoAxeViolations(container);
    await submitIntake(user);

    expect(await screen.findByText('Question 1 of 2')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/diagnostic/diag-1');
    expect(sent.resolve).toEqual({ text: 'ux research' });
    expect(sent.start).toEqual({
      topicId: mockTopic.id,
      goal: 'Run usability studies',
      weeklyHours: 3,
      preferredFormats: ['video', 'text'],
    });
  });

  it('an ambiguous topic offers choices; the pick is used', { timeout: 15_000 }, async () => {
    const sent = capture();
    server.use(
      http.post('/v1/topics/resolve', ({ response }) => response(200).json({ status: 'choices', choices })),
    );
    const { user, router, container } = await openForm();
    await submitIntake(user, 'java');
    expect(await screen.findByRole('heading', { name: 'Which topic did you mean?' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    await expectNoAxeViolations(container);
    await user.click(screen.getByRole('radio', { name: /^JavaScript/ }));
    await user.click(screen.getByRole('button', { name: 'Continue with this topic' }));
    await screen.findByText('Question 1 of 2');
    expect(sent.start?.topicId).toBe('javascript');
    expect(router.state.location.pathname).toBe('/diagnostic/diag-1');
  });

  it('"None of these" returns to the form with what was typed', { timeout: 15_000 }, async () => {
    server.use(
      http.post('/v1/topics/resolve', ({ response }) => response(200).json({ status: 'choices', choices })),
    );
    const { user } = await openForm();
    await submitIntake(user, 'java');
    await user.click(await screen.findByRole('button', { name: 'None of these, change my topic' }));
    expect(screen.getByLabelText('What do you want to learn?')).toHaveValue('java');
    expect(screen.getByLabelText("What's your goal?")).toHaveValue('Run usability studies');
  });

  it('a newly created topic continues like a match', { timeout: 15_000 }, async () => {
    const sent = capture();
    server.use(
      http.post('/v1/topics/resolve', ({ response }) =>
        response(200).json({ status: 'created', topic: { id: 'new-topic', canonicalName: 'Beekeeping' } }),
      ),
    );
    const { user } = await openForm();
    await submitIntake(user, 'beekeeping');
    await screen.findByText('Question 1 of 2');
    expect(sent.start?.topicId).toBe('new-topic');
  });

  it('shows API field errors on the topic and network failures as a message', { timeout: 15_000 }, async () => {
    server.use(
      http.post('/v1/topics/resolve', ({ response }) =>
        response.untyped(
          problemResponse(
            mockProblem(400, 'VALIDATION_FAILED', 'Invalid', { errors: [{ field: 'text', message: 'Too vague' }] }),
          ),
        ),
      ),
    );
    const { user } = await openForm();
    await submitIntake(user, 'it');
    expect(await screen.findByRole('alert')).toHaveTextContent('Check the highlighted fields.');
    expect(screen.getByLabelText('What do you want to learn?')).toHaveAccessibleDescription('Too vague');

    server.use(http.post('/v1/topics/resolve', ({ response }) => response.untyped(Response.error())));
    await user.clear(screen.getByLabelText('What do you want to learn?'));
    await user.type(screen.getByLabelText('What do you want to learn?'), 'ux research');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/Could not reach the server/, {}, { timeout: 8000 })).toBeInTheDocument();
  });
});
