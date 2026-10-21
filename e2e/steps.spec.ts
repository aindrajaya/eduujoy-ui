import { expect, test, type Page } from '@playwright/test';
import { mockPath, mockPathSummary } from '../src/api/mocks/data';
import type { FeedbackRequest, StepPatchRequest } from '../src/api/types';
import { json, mockAuth } from './api';

// U8 done-when: the six-step SOP overview, a step with its resources (US-04), a video that loads
// only on tap, swap (US-07) and difficulty (US-08), all from the cached path (PRD-UI §3, §11).

const step2 = mockPath.steps[1];
const [video, article] = step2?.resources ?? [];
const whyThis = video?.whyThis;
const takeaways = video?.keyTakeaways ?? [];
if (!step2 || !video || !whyThis || takeaways.length === 0 || !article) throw new Error('mockPath step 2 needs a video and an article');

async function mockPaths(page: Page) {
  const calls = { patches: [] as StepPatchRequest[], feedback: [] as FeedbackRequest[], swaps: 0 };
  await mockAuth(page, { signedIn: true });
  await page.route('**/v1/paths?*', (route) => json(route, 200, { items: [mockPathSummary], nextCursor: null }));
  await page.route('**/v1/paths/path-1', (route) => json(route, 200, mockPath));
  await page.route('**/v1/steps/*', async (route) => {
    const patch = route.request().postDataJSON() as StepPatchRequest;
    calls.patches.push(patch);
    return json(route, 200, { ...step2, ...(patch.difficulty ? { difficulty: patch.difficulty } : {}) });
  });
  await page.route('**/v1/feedback', (route) => {
    calls.feedback.push(route.request().postDataJSON() as FeedbackRequest);
    return route.fulfill({ status: 204 });
  });
  await page.route('**/v1/resources/*/swap', (route) => {
    calls.swaps += 1;
    return json(route, 200, {
      ...step2,
      resources: [{ ...video, id: 'res-new', title: 'A fresh explainer' }, article],
    });
  });
  // Keep YouTube offline: an empty thumbnail and an empty player page.
  await page.route('https://i.ytimg.com/**', (route) => route.fulfill({ status: 200, contentType: 'image/jpeg', body: '' }));
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>player</title>' }),
  );
  return calls;
}

test.describe('paths and steps (U8)', () => {
  test('Today leads through the six-step overview to the current step (US-03)', async ({ page }) => {
    await mockPaths(page);
    await page.goto('/today');
    await page.getByRole('link', { name: 'See the whole path' }).click();
    await expect(page).toHaveURL(/\/paths\/path-1$/);
    await expect(page.getByRole('region', { name: 'Steps' }).getByRole('listitem')).toHaveCount(6);
    await page.getByRole('link', { name: /Continue: Step 2/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: step2.objective })).toBeVisible();
    await expect(page).toHaveURL(/\/steps\/step-2\?path=path-1$/);
  });

  test('a step shows why-this and takeaways, and loads the video only on tap (US-04)', async ({ page }) => {
    await mockPaths(page);
    await page.goto('/steps/step-2?path=path-1');
    const card = page.getByRole('article').first();
    await expect(card.getByText(whyThis)).toBeVisible();
    for (const takeaway of takeaways) await expect(card.getByText(takeaway)).toBeVisible();
    await expect(card.getByText('Watch 04:10–07:45')).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);

    await card.getByRole('button', { name: /Play video/ }).click();
    const frame = page.locator('iframe');
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/Fj-2tVw0d1g\?.*start=250.*end=465/);
  });

  test('a resource is thumbed down and swapped (US-07), and difficulty is recorded (US-08)', async ({ page }) => {
    const calls = await mockPaths(page);
    await page.goto('/steps/step-2?path=path-1');
    const card = page.getByRole('article').first();
    await card.getByRole('button', { name: 'Not helpful' }).click();
    await expect(card.getByRole('button', { name: 'Not helpful' })).toHaveAttribute('aria-pressed', 'true');
    await card.getByRole('button', { name: 'Swap', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'A fresh explainer' })).toBeVisible();
    await expect(page.getByText('Swapped for another resource', { exact: true })).toBeVisible();
    expect(calls.feedback).toEqual([{ targetType: 'resource', targetId: 'res-2-yt', kind: 'down' }]);
    expect(calls.swaps).toBe(1);

    await page.getByRole('radio', { name: 'Too hard' }).click();
    await expect(page.getByRole('radio', { name: 'Too hard' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('Thanks. We’ll adjust your next steps.', { exact: true })).toBeVisible();
    expect(calls.patches).toContainEqual({ difficulty: 'too_hard' });
  });
});
