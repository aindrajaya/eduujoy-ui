import { expect, test } from '@playwright/test';
import { mockAuth } from './api';

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
    await expect(page.getByRole('status')).toHaveText(/Your session expired/);
    await expect(page.getByRole('heading', { name: 'Jane Doe' })).toBeHidden();
  });
});
