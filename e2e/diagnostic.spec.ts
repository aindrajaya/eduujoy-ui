import { expect, test, type Page } from '@playwright/test';
import { mockTopic } from '../src/api/mocks/data';
import type { DiagnosticAnswersRequest, DiagnosticBatchResponse, DiagnosticItem } from '../src/api/types';
import { json, mockAuth } from './api';

// US-02: 8–12 adaptive items spanning C1–C6, incl. ≥ 1 scenario item; the result shows stage,
// Bloom level, confidence and a one-line reason. The fake API serves three batches (4 + 4 + 2).

const choice = (id: string, bloom: DiagnosticItem['bloom'], prompt: string): DiagnosticItem => ({
  id,
  bloom,
  kind: 'single_choice',
  prompt,
  options: [
    { id: 'a', label: 'Option A' },
    { id: 'b', label: 'Option B' },
    { id: 'c', label: 'Option C' },
  ],
});

const BATCHES: DiagnosticItem[][] = [
  [
    choice('i1', 'C1', 'Which of these is a usability heuristic?'),
    choice('i2', 'C2', 'What does a task success rate measure?'),
    { id: 'i3', bloom: 'C3', kind: 'multi_choice', prompt: 'Pick every method that observes real behaviour', options: [{ id: 'a', label: 'Field study' }, { id: 'b', label: 'Survey' }, { id: 'c', label: 'Diary study' }] },
    { id: 'i4', bloom: 'C4', kind: 'scenario', prompt: 'Scenario: sign-ups dropped 20% after a redesign. What do you analyse first?' },
  ],
  [
    choice('i5', 'C4', 'Which finding is most likely a sampling artefact?'),
    { id: 'i6', bloom: 'C5', kind: 'scenario', prompt: 'Scenario: two studies disagree. How do you judge which to trust?' },
    choice('i7', 'C5', 'Which metric best evaluates onboarding?'),
    { id: 'i8', bloom: 'C6', kind: 'short_answer', prompt: 'Design a one-week study plan in a sentence.' },
  ],
  [choice('i9', 'C3', 'Apply: which prototype fidelity fits a pricing test?'), choice('i10', 'C2', 'Explain what “satisficing” means.')],
];
const TOTAL = BATCHES.flat().length;

/** A stateful fake of the diagnostic API; `served` is the index of the outstanding batch. */
async function mockDiagnosticApi(page: Page, startAt = 0) {
  const state = { served: startAt, submitted: [] as DiagnosticAnswersRequest[] };
  const batch = (): DiagnosticBatchResponse => {
    const answered = BATCHES.slice(0, state.served).flat().length;
    if (state.served >= BATCHES.length) {
      return {
        diagnosticId: 'diag-e2e',
        status: 'completed',
        progress: { answered: TOTAL, estimatedTotal: TOTAL },
        items: [],
        placement: {
          id: 'placement-e2e',
          confidence: 0.82,
          position: { stage: 'competent', bloom: 'C4' },
          reason: 'Strong on methods and analysis; evaluation of conflicting evidence is still shaky.',
        },
      };
    }
    return { diagnosticId: 'diag-e2e', status: 'in_progress', progress: { answered, estimatedTotal: TOTAL }, items: BATCHES[state.served] };
  };
  await page.route('**/v1/diagnostics/diag-e2e', (route) =>
    json(route, 200, { ...batch(), topic: mockTopic, createdAt: '2026-10-21T08:00:00Z', completedAt: null }),
  );
  await page.route('**/v1/diagnostics/diag-e2e/answers', (route) => {
    state.submitted.push(route.request().postDataJSON() as DiagnosticAnswersRequest);
    state.served += 1;
    return json(route, 200, batch());
  });
  await page.route('**/v1/paths', (route) =>
    json(route, 202, { jobId: 'job-e2e', status: 'queued', eventsUrl: '/v1/jobs/job-e2e/events' }),
  );
  return state;
}

async function answerVisible(page: Page) {
  // Wait for a question (not the brief "Saving your answers…" between batches).
  await expect(page.getByText(/^Question \d+ of \d+$/)).toBeVisible();
  const radio = page.getByRole('radio').first();
  const checkbox = page.getByRole('checkbox').first();
  if (await radio.isVisible()) await radio.check();
  else if (await checkbox.isVisible()) await checkbox.check();
  else await page.getByRole('textbox', { name: 'Your answer' }).fill('I would compare sample sizes and recency first.');
  await page.getByRole('button', { name: /^(Next|Continue)$/ }).click();
}

test.describe('diagnostic (US-02)', () => {
  test('10 adaptive items across C1–C6 (with scenarios) end in a placement with confidence and reason', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    const api = await mockDiagnosticApi(page);
    await page.goto('/diagnostic/diag-e2e');

    const seenPrompts: string[] = [];
    for (let i = 0; i < TOTAL; i += 1) {
      const prompt = page.getByRole('heading', { level: 2 });
      await expect(prompt).toBeVisible();
      seenPrompts.push((await prompt.textContent()) ?? '');
      await answerVisible(page);
    }

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('You’re at Competent in Product Design (UI/UX)');
    await expect(page.getByText('Analyse')).toBeVisible();
    await expect(page.getByText('82%')).toBeVisible();
    await expect(page.getByText(/evaluation of conflicting evidence/)).toBeVisible();

    expect(seenPrompts).toHaveLength(TOTAL);
    expect(seenPrompts.filter((p) => p.startsWith('Scenario:')).length).toBeGreaterThanOrEqual(1);
    expect(new Set(BATCHES.flat().map((i) => i.bloom))).toEqual(new Set(['C1', 'C2', 'C3', 'C4', 'C5', 'C6']));
    // One request per batch, each with every item of that batch.
    expect(api.submitted.map((s) => s.answers.length)).toEqual([4, 4, 2]);
  });

  test('a reload mid-diagnostic resumes the outstanding batch and keeps local answers', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    await mockDiagnosticApi(page, 1);
    await page.goto('/diagnostic/diag-e2e');
    await expect(page.getByText('4 of about 10 answered')).toBeVisible();
    await answerVisible(page);
    await expect(page.getByText('Question 2 of 4')).toBeVisible();
    await page.waitForTimeout(1300); // draft debounce
    await page.reload();
    await expect(page.getByText('Question 2 of 4')).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('radio').first()).toBeChecked();
  });

  test('“Build my path” starts generation and hands off', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    await mockDiagnosticApi(page, BATCHES.length);
    // The generation screen (U7) opens the job's event stream; the job has just started.
    await page.route('**/v1/jobs/job-e2e/events', (route) =>
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'id: 1\nevent: progress\ndata: {"jobId":"job-e2e","stage":"queued","done":0,"total":0}\n\n',
      }),
    );
    await page.goto('/diagnostic/diag-e2e');
    await page.getByRole('button', { name: 'Build my path' }).click();
    await expect(page).toHaveURL(/\/paths\/new\/job-e2e$/);
    await expect(page.getByRole('heading', { name: 'Building your path…' })).toBeVisible();
  });
});
