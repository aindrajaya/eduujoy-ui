import { expect, test } from '@playwright/test';
import { mockMe, mockProblem } from '../src/api/mocks/data';
import { json, mockAuth, problem } from './api';
import { mockRealtime } from './realtime';

// Contract 0.6.0 and 0.7.0 on /account: export, delete with a fresh sign-in, and the checkout
// return hint.

test.describe('account data and checkout (contract 0.6.0, 0.7.0)', () => {
  test('downloads my data as a JSON file', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    await page.route('**/v1/me/export', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Content-Disposition': 'attachment; filename="eduujoy-export.json"' },
        body: JSON.stringify({ user: mockMe.user }),
      }),
    );
    await page.goto('/account');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download my data' }).click();
    expect((await download).suggestedFilename()).toBe('eduujoy-export.json');
    await expect(page.getByText('Downloaded eduujoy-export.json.')).toBeVisible();
  });

  test('delete asks first, sends the learner to sign in again (no refresh), then deletes', async ({ page }) => {
    const auth = await mockAuth(page, { signedIn: true });
    let freshSignIn = false;
    let deleted = false;
    await page.route('**/v1/auth/login', async (route) => {
      freshSignIn = true;
      return json(route, 200, mockMe);
    });
    await page.route('**/v1/me', (route) => {
      if (route.request().method() !== 'DELETE') return route.fallback();
      if (!freshSignIn) return problem(route, mockProblem(401, 'REAUTH_REQUIRED', 'Sign in again'));
      deleted = true;
      return route.fulfill({ status: 204 });
    });

    await page.goto('/account');
    await page.getByRole('button', { name: 'Delete my account' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete your account?' });
    await expect(dialog.getByRole('button', { name: 'Keep my account' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Delete my account' }).click();

    await expect(page).toHaveURL(/\/signin\?next=%2Faccount%3Fdelete%3D1&reauth=1$/);
    await expect(page.getByText('For your security, sign in again to delete your account.')).toBeVisible();
    expect(auth.refreshCalls).toBe(0);

    await page.getByLabel('Email').fill('jane.doe@example.com');
    await page.getByLabel('Password').fill('correct-horse-battery');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/account\?delete=1$/);
    await expect(dialog.getByText('You signed in again. Confirm to delete your account.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete my account' }).click();

    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByText('Your account and personal data have been deleted.')).toBeVisible();
    expect(deleted).toBe(true);
  });

  test('back from Lemon Squeezy, the payment shows as activating until the plan changes', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    const socket = await mockRealtime(page);
    await page.goto('/account?checkout=success');
    await expect(page.getByText('Payment received, activating…')).toBeVisible();
    await socket.connected;
    socket.emit('entitlement.changed', { plan: 'subscription', quota: { ...mockMe.quota, monthlyPaths: 10 } });
    await expect(page.getByText('Payment confirmed. Your plan is updated.')).toBeVisible();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole('region', { name: 'Your plan' })).toContainText('Subscription');
  });

  test('buys three credit packs in one checkout', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    let body: unknown;
    await page.route('**/v1/billing/checkout', (route) => {
      body = route.request().postDataJSON();
      return json(route, 200, { url: 'https://eduujoy.lemonsqueezy.com/checkout/three' });
    });
    await page.route('https://eduujoy.lemonsqueezy.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Checkout</title>' }),
    );
    await page.goto('/account');
    await page.getByRole('combobox', { name: 'Credit packs' }).selectOption('3');
    await page.getByRole('button', { name: 'Buy 3 credit packs' }).click();
    await expect(page).toHaveURL('https://eduujoy.lemonsqueezy.com/checkout/three');
    expect(body).toEqual({ product: 'credit_pack', quantity: 3 });
  });
});
