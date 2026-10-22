import { expect, test, type Page } from '@playwright/test';
import { mockDiagnosticBatch, mockMe, mockProblem, mockTopic } from '../src/api/mocks/data';
import type { DiagnosticStartRequest, TopicResolveRequest } from '../src/api/types';
import { json, mockAuth, problem } from './api';

const javaChoices = [
  { id: 'java-lang', canonicalName: 'Java (programming language)', description: 'The JVM language', similarity: 0.84 },
  { id: 'javascript', canonicalName: 'JavaScript', similarity: 0.81 },
  { id: 'java-coffee', canonicalName: 'Java coffee', similarity: 0.76 },
];

/** Fakes topic resolution and diagnostic start; records what the UI sent. */
async function mockIntakeApi(page: Page) {
  const sent: { resolve: TopicResolveRequest[]; start: DiagnosticStartRequest[] } = { resolve: [], start: [] };
  await page.route('**/v1/topics/resolve', async (route) => {
    const body = route.request().postDataJSON() as TopicResolveRequest;
    sent.resolve.push(body);
    const text = body.text.trim().toLowerCase();
    if (text === 'java') return json(route, 200, { status: 'choices', choices: javaChoices });
    if (text.length < 3) {
      return problem(route, mockProblem(400, 'VALIDATION_FAILED', 'Invalid', { errors: [{ field: 'text', message: 'Too vague to place' }] }));
    }
    return json(route, 200, { status: 'matched', topic: mockTopic });
  });
  await page.route('**/v1/diagnostics', async (route) => {
    sent.start.push(route.request().postDataJSON() as DiagnosticStartRequest);
    return json(route, 201, mockDiagnosticBatch);
  });
  return sent;
}

async function openIntake(page: Page) {
  await page.goto('/start');
  await page.getByRole('button', { name: /get started/i }).click();
  await expect(page.getByRole('heading', { name: "Let's Get Started!" })).toBeVisible();
}

test.describe('onboarding (US-01)', () => {
  test('free-text topic, goal and weekly hours map to a canonical topic and start the diagnostic', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    const sent = await mockIntakeApi(page);
    await openIntake(page);

    await page.getByLabel('What do you want to learn?').fill('UX research');
    await page.getByLabel("What's your goal?").fill('Run usability studies at my startup');
    await page.getByRole('radio', { name: /^Comfortable/ }).check();
    await page.getByLabel('Hours per week').fill('6');
    await page.getByRole('checkbox', { name: 'Research papers' }).check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL(/\/diagnostic\/diag-1$/);
    await expect(page.getByText('Question 1 of 2')).toBeVisible();
    expect(sent.resolve).toEqual([{ text: 'UX research' }]);
    expect(sent.start).toEqual([
      {
        topicId: mockTopic.id,
        goal: 'Run usability studies at my startup',
        weeklyHours: 6,
        preferredFormats: ['video', 'text', 'papers'],
        selfReport: { years: 3, projectsShipped: 3 },
      },
    ]);
  });

  test('ambiguous input offers at most three choices and uses the one picked', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    const sent = await mockIntakeApi(page);
    await openIntake(page);

    await page.getByLabel('What do you want to learn?').fill('java');
    await page.getByLabel("What's your goal?").fill('Get a backend job');
    await page.getByRole('radio', { name: 'I’m new to this' }).check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: 'Which topic did you mean?' })).toBeVisible();
    const radios = page.getByRole('radio');
    await expect(radios).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Continue with this topic' })).toBeDisabled();
    await page.getByRole('radio', { name: /^Java \(programming language\)/ }).check();
    await page.getByRole('button', { name: 'Continue with this topic' }).click();

    await expect(page).toHaveURL(/\/diagnostic\/diag-1$/);
    expect(sent.start[0]?.topicId).toBe('java-lang');
  });

  test('validation: hours out of range and a too-vague topic are explained on the fields', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    const sent = await mockIntakeApi(page);
    await openIntake(page);

    await page.getByLabel('What do you want to learn?').fill('ux');
    await page.getByLabel("What's your goal?").fill('Get better');
    await page.getByRole('radio', { name: 'I’m new to this' }).check();
    await page.getByLabel('Hours per week').fill('60');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Between 1 and 40 hours a week')).toBeVisible();
    expect(sent.resolve).toHaveLength(0);

    await page.getByLabel('Hours per week').fill('5');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Too vague to place')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveText('Check the highlighted fields.');
  });

  test('a new account lands on onboarding after sign-up', async ({ page }) => {
    await mockAuth(page, { signedIn: false });
    await page.route('**/v1/auth/register', (route) => json(route, 201, { ...mockMe, user: { id: 'u9', email: 'new@example.com', locale: 'en' } }));
    await page.goto('/signup');
    await page.getByLabel('Email').fill('new@example.com');
    await page.getByLabel('Password').fill('long-enough-pw');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/start$/);
  });
});
