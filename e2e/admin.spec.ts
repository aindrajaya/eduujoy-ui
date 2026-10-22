import { expect, test, type Page } from '@playwright/test';
import { mockCostMetrics, mockLatencyMetrics, mockMe, mockPath, mockPathSummary, mockReviewItems } from '../src/api/mocks/data';
import type { ReviewResolveRequest, Role } from '../src/api/types';
import { json, mockAuth } from './api';

// U11 done-when: a reviewer can resolve an item; learners cannot load the admin chunk (PRD-UI §11).

const STAFF_CHUNK = /\/assets\/(ReviewQueuePage|MetricsPage)-[\w-]+\.js$/;

/** Records every staff chunk the page requests. */
function watchStaffChunks(page: Page) {
  const requested: string[] = [];
  page.on('request', (request) => {
    if (STAFF_CHUNK.test(request.url())) requested.push(request.url());
  });
  return requested;
}

async function signInAs(page: Page, ...roles: Role[]) {
  await mockAuth(page, { signedIn: true, me: { ...mockMe, roles } });
}

test.describe('admin (U11)', () => {
  test('a reviewer resolves an item from the review queue (FR-24)', async ({ page }) => {
    await signInAs(page, 'learner', 'reviewer');
    const resolved = new Set<string>();
    let body: ReviewResolveRequest | undefined;
    await page.route('**/v1/admin/review-queue?*', (route) => {
      const items = mockReviewItems.filter((i) => i.status === 'open' && !resolved.has(i.id));
      return json(route, 200, { items, openCount: items.length, nextCursor: null });
    });
    await page.route('**/v1/admin/review-queue/*', (route) => {
      const id = new URL(route.request().url()).pathname.split('/').pop() ?? '';
      body = route.request().postDataJSON() as ReviewResolveRequest;
      resolved.add(id);
      const item = mockReviewItems.find((i) => i.id === id);
      return json(route, 200, { ...item, status: 'resolved', resolution: body.resolution });
    });

    await page.goto('/account');
    await page.getByRole('link', { name: 'Review queue' }).click();
    await expect(page).toHaveURL(/\/admin\/review$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Review queue' })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Costs and latency' })).toHaveCount(0);

    const card = page.getByRole('article').filter({ hasText: 'region-locked' });
    await card.getByLabel('Note (optional)').fill('Replaced with a mirror');
    await card.getByRole('button', { name: 'Reject' }).click();
    await expect(page.getByRole('article')).toHaveCount(2);
    await expect(page.getByRole('link', { name: /Review queue 2 open/ })).toBeVisible();
    expect(body).toEqual({ resolution: 'rejected', note: 'Replaced with a mirror' });
  });

  test('a learner cannot load the admin chunk: no request for it, and no access', async ({ page }) => {
    await signInAs(page, 'learner');
    await page.route('**/v1/paths?*', (route) => json(route, 200, { items: [mockPathSummary], nextCursor: null }));
    await page.route('**/v1/paths/path-1', (route) => json(route, 200, mockPath));
    const requested = watchStaffChunks(page);

    // Learner screens first: nothing they load may contain staff code.
    for (const url of ['/today', '/steps/step-2?path=path-1', '/paths/path-1', '/account']) {
      await page.goto(url);
      await expect(page.getByRole('main').first()).toBeVisible();
    }
    await expect(page.getByRole('link', { name: 'Review queue' })).toHaveCount(0);

    for (const url of ['/admin/review', '/admin/metrics']) {
      await page.goto(url);
      await expect(page.getByRole('heading', { name: 'No access' })).toBeVisible();
    }
    expect(requested).toEqual([]);
    expect(await page.evaluate(() => window.__eduujoyStaffCode)).toBeUndefined();
  });

  test('an admin sees cost and latency per stage and model (FR-25)', async ({ page }) => {
    await signInAs(page, 'admin');
    await page.route('**/v1/admin/metrics/cost?*', (route) => json(route, 200, mockCostMetrics));
    await page.route('**/v1/admin/metrics/latency?*', (route) => json(route, 200, mockLatencyMetrics));
    const requested = watchStaffChunks(page);
    await page.goto('/admin/metrics');
    const cost = page.getByRole('table', { name: /AI cost per pipeline stage/ });
    await expect(cost.getByRole('rowheader', { name: 'design' })).toBeVisible();
    await expect(cost.getByText('$4.12')).toBeVisible();
    await expect(page.getByRole('table', { name: /Latency per pipeline stage/ }).getByText('19.5 s')).toBeVisible();
    expect(requested.length).toBeGreaterThan(0);
  });
});
