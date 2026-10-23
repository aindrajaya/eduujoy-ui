import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockDiagnosticBatch, mockRelatedTopics, mockTopic, mockTopicNoBank } from '@/api/mocks/data';
import { http } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import type { DiagnosticStartRequest } from '@/api/types';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

// Contract 0.9.0/0.9.1: a topic without a diagnostic item bank says so before the diagnostic, and
// offers nearby topics with a bank (prod report, 22 Oct 2026: a 0-question diagnostic).

async function intake(topic: string) {
  const user = userEvent.setup();
  const view = renderRoute('/start');
  await user.click(await screen.findByRole('button', { name: /get started/i }));
  await waitForElementToBeRemoved(() => screen.queryByRole('heading', { name: /welcome to eduujoy/i }));
  await user.type(screen.getByLabelText('What do you want to learn?'), topic);
  await user.type(screen.getByLabelText("What's your goal?"), 'Make generative art');
  await user.click(screen.getByRole('radio', { name: 'I’m new to this' }));
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  return { user, ...view };
}

function captureStart() {
  const sent: DiagnosticStartRequest[] = [];
  server.use(
    http.post('/v1/diagnostics', async ({ request, response }) => {
      sent.push(await request.json());
      return response(201).json(mockDiagnosticBatch);
    }),
  );
  return sent;
}

describe('/start without a question bank (contract 0.9.0)', () => {
  it('a created topic with related topics: says so, offers them, and each starts a normal diagnostic', async () => {
    const sent = captureStart();
    const { user, router, container } = await intake('creative coding');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'We don’t have questions for Creative coding yet' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your level will come from your self-report, and your first checkpoint will adjust it.'),
    ).toBeInTheDocument();
    const closer = screen.getByRole('region', { name: 'Closer topics we can test you on' });
    expect(closer.querySelectorAll('li')).toHaveLength(mockRelatedTopics.length);
    expect(sent).toHaveLength(0);
    await expectNoAxeViolations(container);

    await user.click(screen.getByRole('button', { name: /^JavaScript/ }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/diagnostic/${mockDiagnosticBatch.diagnosticId}`);
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.topicId).toBe('topic-js');
  });

  it('“Continue with {topic}” starts the diagnostic on the topic without questions', async () => {
    const sent = captureStart();
    const { user, router } = await intake('creative coding');
    await user.click(await screen.findByRole('button', { name: 'Continue with Creative coding' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/diagnostic/${mockDiagnosticBatch.diagnosticId}`);
    });
    expect(sent[0]?.topicId).toBe(mockTopicNoBank.id);
  });

  it('a created topic without related topics: the notice and Continue only', async () => {
    captureStart();
    await intake('underwater basket weaving');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'We don’t have questions for Underwater basket weaving yet' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Closer topics we can test you on' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Underwater basket weaving' })).toBeInTheDocument();
  });

  it('“Change my topic” goes back to the form with the answers kept', async () => {
    captureStart();
    const { user } = await intake('underwater basket weaving');
    await user.click(await screen.findByRole('button', { name: 'Change my topic' }));
    expect(screen.getByLabelText('What do you want to learn?')).toHaveValue('underwater basket weaving');
  });

  it('a matched topic with a bank starts at once, with no notice', async () => {
    const sent = captureStart();
    const { router } = await intake('ux research');
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/diagnostic/${mockDiagnosticBatch.diagnosticId}`);
    });
    expect(screen.queryByText(/We don’t have questions/)).not.toBeInTheDocument();
    expect(sent[0]?.topicId).toBe(mockTopic.id);
  });

  it('a chosen topic without a bank shows the notice before starting', async () => {
    const sent = captureStart();
    server.use(
      http.post('/v1/topics/resolve', ({ response }) =>
        response(200).json({ status: 'choices', choices: [{ ...mockTopicNoBank, similarity: 0.8 }, { ...mockTopic, similarity: 0.7 }] }),
      ),
    );
    const { user } = await intake('code art');
    await user.click(await screen.findByRole('radio', { name: /^Creative coding/ }));
    await user.click(screen.getByRole('button', { name: 'Continue with this topic' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'We don’t have questions for Creative coding yet' }),
    ).toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });
});
