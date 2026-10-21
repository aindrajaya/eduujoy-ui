import { expect, test } from '@playwright/test';
import { mockPath, mockProblem } from '../src/api/mocks/data';
import { json, mockAuth, problem } from './api';

test.describe('session expiry', () => {
  test('a session that expires while /account is open redirects to sign-in on refocus', async ({ page }) => {
    await page.clock.install();
    const auth = await mockAuth(page, { signedIn: true });
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Jane Doe' })).toBeVisible();

    // The server-side session ends (refresh token revoked or expired) while the tab sits idle,
    // long enough for the cached auth/me answer (5 min staleTime) to go stale.
    auth.signedIn = false;
    await page.clock.fastForward('06:00');

    // The learner comes back to the tab.
    await page.evaluate(() => {
      window.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });

    await expect(page).toHaveURL(/\/signin\?next=%2Faccount&expired=1$/);
    await expect(page.getByText(/Your session expired/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Jane Doe' })).toBeHidden();
  });

  test('a session that expires before a step save refreshes once, then redirects to sign-in', async ({ page }) => {
    const auth = await mockAuth(page, { signedIn: true });
    await page.route('**/v1/paths?*', (route) => json(route, 200, { items: [], nextCursor: null }));
    await page.route('**/v1/paths/path-1', (route) => json(route, 200, mockPath));
    await page.route('**/v1/steps/*', (route) => problem(route, mockProblem(401, 'UNAUTHENTICATED', 'Sign in required')));
    await page.goto('/steps/step-2?path=path-1');
    const box = page.getByRole('checkbox', { name: /Write a one-page plan/ });
    await expect(box).toBeVisible();

    // The refresh token is revoked server-side; the next data call gets 401 and the refresh fails.
    auth.signedIn = false;
    await box.click();

    await expect(page).toHaveURL(/\/signin\?next=%2Fsteps%2Fstep-2%3Fpath%3Dpath-1&expired=1$/);
    await expect(page.getByText(/Your session expired/)).toBeVisible();
    // One refresh for the failed save, one for the auth/me re-check (cold-start rule); no loop.
    expect(auth.refreshCalls).toBeLessThanOrEqual(2);
  });
});

test.describe('sign-out', () => {
  test('works after the access cookie has expired, without a refresh', async ({ page }) => {
    const auth = await mockAuth(page, { signedIn: true });
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Jane Doe' })).toBeVisible();

    auth.accessExpired = true;
    const refreshesBefore = auth.refreshCalls;
    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    expect(auth.logoutCalls).toBe(1);
    expect(auth.refreshCalls).toBe(refreshesBefore);
    expect(auth.signedIn).toBe(false);
  });
});
