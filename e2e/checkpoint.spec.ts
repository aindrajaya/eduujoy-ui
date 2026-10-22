import { expect, test, type Page } from '@playwright/test';
import {
  mockCheckpointFailed,
  mockCheckpointResult,
  mockGradeJobAccepted,
  mockGradeJobEvents,
  mockPath, mockPathSummary,
} from '../src/api/mocks/data';
import { toEventStreamText } from '../src/api/mocks/sse';
import type { CheckpointResult, Path, PathStep } from '../src/api/types';
import { json, mockAuth } from './api';
import { SCREENS } from './screens';

// U9 done-when: US-05 passes, including offline submit (PRD-UI §11). Open answers are graded by a
// job whose result streams over SSE; two fails insert a review step one level lower.

const step2 = mockPath.steps[1];
if (!step2) throw new Error('mockPath needs step 2');
const reviewStep: PathStep = { ...step2, id: 'step-2r', n: 3, remedial: true, bloom: 'C2', status: 'active' };

type Reply = { status: 200; result: CheckpointResult } | { status: 202 };

/** Fakes the path and the checkpoint API; `replies` answers each submission in turn. */
async function mockCheckpoint(page: Page, replies: Reply[], pathAfter: (submissions: number) => Path = () => mockPath) {
  const calls = { keys: [] as string[], bodies: [] as unknown[] };
  await mockAuth(page, { signedIn: true });
  await page.route('**/v1/paths?*', (route) => json(route, 200, { items: [mockPathSummary], nextCursor: null }));
  await page.route('**/v1/paths/path-1', (route) => json(route, 200, pathAfter(calls.keys.length)));
  await page.route('**/v1/checkpoints/*/submissions', (route) => {
    calls.keys.push(route.request().headers()['idempotency-key'] ?? '');
    calls.bodies.push(route.request().postDataJSON());
    const reply = replies[Math.min(calls.keys.length, replies.length) - 1] ?? { status: 202 };
    return reply.status === 200 ? json(route, 200, reply.result) : json(route, 202, mockGradeJobAccepted);
  });
  await page.route('**/v1/jobs/grade-1/events', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      body: `: connected\n\n${toEventStreamText(mockGradeJobEvents)}`,
    }),
  );
  return calls;
}

async function answerAll(page: Page, written: string) {
  await page.getByRole('radio', { name: 'Interviews' }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('checkbox', { name: 'Usability tests' }).check();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('textbox', { name: 'Your answer' }).fill(written);
  await page.getByRole('button', { name: 'Review answers' }).click();
}

test.describe('checkpoints (U9, US-05)', () => {
  test('a step leads to its checkpoint; open answers are graded over SSE; a pass leads on', async ({ page }) => {
    const calls = await mockCheckpoint(page, [{ status: 202 }]);
    await page.goto('/steps/step-2?path=path-1');
    await page.getByRole('link', { name: /Start checkpoint/ }).click();
    await expect(page).toHaveURL(/\/checkpoints\/step-2\?path=path-1$/);
    await answerAll(page, 'Interviews, because they explain why sign-ups dropped.');
    await page.getByRole('button', { name: 'Submit answers' }).click();

    await expect(page.getByRole('heading', { name: 'You passed this checkpoint' })).toBeFocused();
    await expect(page).toHaveURL(/job=grade-1/);
    await expect(page.getByText('Interviews fit. Say what you would ask')).toBeVisible();
    expect(calls.bodies).toEqual([
      {
        answers: [
          { itemId: 'cp-2-1', optionIds: ['b'] },
          { itemId: 'cp-2-2', optionIds: ['a'] },
          { itemId: 'cp-2-3', text: 'Interviews, because they explain why sign-ups dropped.' },
        ],
      },
    ]);
    await page.getByRole('link', { name: /Next: Step 3/ }).click();
    await expect(page).toHaveURL(/\/steps\/step-3\?path=path-1$/);
  });

  test('two fails insert a review step one level lower, which opens from the result', async ({ page }) => {
    const calls = await mockCheckpoint(
      page,
      [
        { status: 200, result: mockCheckpointFailed },
        { status: 200, result: { ...mockCheckpointFailed, remedialStepId: reviewStep.id } },
      ],
      (n) => (n >= 2 ? { ...mockPath, steps: [...mockPath.steps.slice(0, 2), reviewStep, ...mockPath.steps.slice(2)] } : mockPath),
    );
    await page.goto('/checkpoints/step-2?path=path-1');
    await answerAll(page, 'Surveys');
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByRole('heading', { name: 'Not passed yet' })).toBeVisible();
    await expect(page.getByText('If you miss it twice')).toBeVisible();

    await page.getByRole('button', { name: /Try again/ }).click();
    await answerAll(page, 'Surveys again');
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByText('We added a review step one level lower')).toBeVisible();
    expect(new Set(calls.keys).size).toBe(2); // each attempt has its own idempotency key

    await page.getByRole('link', { name: /Go to the review step/ }).click();
    await expect(page).toHaveURL(/\/steps\/step-2r\?path=path-1$/);
    await expect(page.getByText('after two missed checkpoints')).toBeVisible();
    await expect(page.getByText('C2 · Understand', { exact: true }).first()).toBeVisible();
  });

  test('offline, the submit is queued and sent once the connection is back', async ({ page, context }) => {
    const calls = await mockCheckpoint(page, [{ status: 200, result: mockCheckpointResult }]);
    await page.goto('/checkpoints/step-2?path=path-1');
    await answerAll(page, 'Interviews');
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByText('You are offline. Your answers will be sent when you reconnect.')).toBeVisible();
    expect(calls.keys).toHaveLength(0);

    await context.setOffline(false);
    await expect(page.getByRole('heading', { name: 'You passed this checkpoint' })).toBeVisible();
    expect(calls.keys).toHaveLength(1);
  });

  test('a reload while grading resumes the stream and shows the result', async ({ page }) => {
    await mockCheckpoint(page, [{ status: 202 }]);
    await page.goto('/checkpoints/step-2?path=path-1&job=grade-1');
    await expect(page.getByRole('heading', { name: 'You passed this checkpoint' })).toBeVisible();
    await expect(page.getByText('87%', { exact: true })).toBeVisible();
  });

  test('at 360 px a not-passed result fits: no page overflow, and feedback lines wrap inside their cards', async ({ page }) => {
    const screen = SCREENS.find((sc) => sc.name === 'checkpoint-not-passed');
    if (!screen) throw new Error('checkpoint-not-passed screen missing');
    await page.setViewportSize({ width: 360, height: 740 });
    await screen.setup(page);
    await page.goto(screen.url);
    await screen.ready(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const clipped = await page
      .getByRole('region', { name: /Feedback/ })
      .getByRole('listitem')
      .evaluateAll((items) => items.filter((li) => li.scrollWidth > li.clientWidth).length);
    expect(clipped).toBe(0);
  });
});
