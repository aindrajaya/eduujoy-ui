import { expect, test, type Page } from '@playwright/test';
import { mockMe, mockProgress, mockProgressHistory } from '../src/api/mocks/data';
import type { ProgressResponse } from '../src/api/types';
import { json, mockAuth } from './api';
import { mockRealtime } from './realtime';

// U10 done-when: US-09 passes and a second tab updates live (PRD-UI §11). The Socket.IO server is
// faked on the routed WebSocket (realtime.ts).

const [current] = mockProgress.items;
if (!current) throw new Error('mockProgress needs an item');
const advanced: ProgressResponse = { items: [{ ...current, position: { stage: 'competent', bloom: 'C3' } }] };

/** Serves progress; `state.advanced` flips what GET /v1/progress returns. */
async function mockProgressApi(page: Page, state: { advanced: boolean }) {
  await mockAuth(page, { signedIn: true });
  await page.route('**/v1/progress', (route) => json(route, 200, state.advanced ? advanced : mockProgress));
  await page.route('**/v1/progress/*/history', (route) => json(route, 200, mockProgressHistory));
}

test.describe('progress, realtime and checkout (U10)', () => {
  test('the grid shows where the learner is and how they moved (US-09)', async ({ page }) => {
    await mockProgressApi(page, { advanced: false });
    await mockRealtime(page);
    await page.goto('/progress');
    await expect(page.getByText('Advanced beginner · C3 Apply', { exact: true })).toBeVisible();
    const grid = page.getByRole('table', { name: /your position/ });
    await expect(grid.getByText('You are here')).toHaveCount(1);
    await expect(grid.getByText(/^Earlier:/)).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'How you moved' }).getByRole('listitem')).toHaveCount(2);
    await expect(page.getByRole('link', { name: /Continue your path/ })).toHaveAttribute('href', '/paths/path-1');
  });

  test('a second tab updates live when the stage advances', async ({ context }) => {
    const state = { advanced: false };
    const [first, second] = [await context.newPage(), await context.newPage()];
    const sockets = [];
    for (const page of [first, second]) {
      await mockProgressApi(page, state);
      sockets.push(await mockRealtime(page));
      await page.goto('/progress');
      await expect(page.getByText('Advanced beginner · C3 Apply', { exact: true })).toBeVisible();
    }
    await Promise.all(sockets.map((s) => s.connected));

    // A checkpoint passed in the first tab moves the learner up; the server tells every tab.
    state.advanced = true;
    const event = {
      topicId: current.topic.id,
      from: current.position,
      to: { stage: 'competent', bloom: 'C3' },
      reassessmentJobId: 'job-2',
    };
    for (const s of sockets) s.emit('stage.advanced', event);

    await expect(second.getByText('Competent · C3 Apply', { exact: true })).toBeVisible();
    await expect(second.getByText('You moved up to Competent', { exact: true })).toBeVisible();
    await second.getByRole('button', { name: 'See your next path' }).click();
    await expect(second).toHaveURL(/\/paths\/new\/job-2$/);
  });

  test('checkout leaves for Lemon Squeezy, and the new plan arrives live', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    const socket = await mockRealtime(page);
    let product: unknown;
    await page.route('**/v1/billing/checkout', (route) => {
      product = (route.request().postDataJSON() as { product: string }).product;
      return json(route, 200, { url: 'https://eduujoy.lemonsqueezy.com/checkout/abc' });
    });
    await page.route('https://eduujoy.lemonsqueezy.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Checkout</title><h1>Test checkout</h1>' }),
    );

    await page.goto('/account');
    const plan = page.getByRole('region', { name: 'Your plan' });
    await expect(plan).toContainText('Free');
    await socket.connected;
    // The webhook upgrades the plan while the page is open.
    socket.emit('entitlement.changed', { plan: 'subscription', quota: { ...mockMe.quota, monthlyPaths: 10 } });
    await expect(plan).toContainText('Subscription');
    await expect(plan).toContainText('10 of 10');
    await expect(page.getByText('Your subscription is active', { exact: true })).toBeVisible();

    await plan.getByRole('button', { name: 'Buy a credit pack' }).click();
    await expect(page).toHaveURL('https://eduujoy.lemonsqueezy.com/checkout/abc');
    expect(product).toBe('credit_pack');
  });
});
