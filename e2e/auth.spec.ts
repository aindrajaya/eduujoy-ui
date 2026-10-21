import { expect, test } from '@playwright/test';
import { mockMe, mockPath } from '../src/api/mocks/data';
import { json, mockAuth } from './api';

test.describe('auth', () => {
  test('no protected markup is in the DOM before auth/me resolves', async ({ page }) => {
    const snapshots: { nav: number; main: number; splash: number }[] = [];
    await page.route('**/v1/auth/me', async (route) => {
      // Sample the DOM while the answer is still pending, then answer as signed in.
      for (let i = 0; i < 5; i += 1) {
        snapshots.push(
          await page.evaluate(() => ({
            nav: document.querySelectorAll('nav').length,
            main: document.querySelectorAll('main').length,
            splash: document.querySelectorAll('[aria-label="Loading Eduujoy"]').length,
          })),
        );
        await new Promise((r) => setTimeout(r, 150));
      }
      await json(route, 200, mockMe);
    });

    await page.goto('/today');
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();

    expect(snapshots.length).toBeGreaterThan(0);
    for (const s of snapshots) expect(s).toEqual({ nav: 0, main: 0, splash: 1 });
  });

  test('a signed-out deep link goes through sign-in and lands where it started', async ({ page }) => {
    await mockAuth(page, { signedIn: false });
    await page.route('**/v1/paths?*', (route) => json(route, 200, { items: [], nextCursor: null }));
    await page.route('**/v1/paths/path-1', (route) => json(route, 200, mockPath));
    await page.goto('/steps/step-2?path=path-1');
    await expect(page).toHaveURL(/\/signin\?next=%2Fsteps%2Fstep-2%3Fpath%3Dpath-1$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    await page.getByLabel('Email').fill('jane.doe@example.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.');

    await page.getByLabel('Password').fill('correct-horse-battery');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/steps\/step-2\?path=path-1$/);
    await expect(page.getByRole('heading', { level: 1, name: mockPath.steps[1]?.objective })).toBeVisible();
  });

  test('signed-in users skip /signin and /signup', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    await page.goto('/signin?next=%2Fprogress');
    await expect(page).toHaveURL(/\/progress$/);
    await page.goto('/signup');
    await expect(page).toHaveURL(/\/today$/);
  });

  test('Google sign-in is a full-page link to the API with returnTo', async ({ page }) => {
    await mockAuth(page, { signedIn: false });
    await page.goto('/signin?next=%2Fpaths');
    await expect(page.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
      'href',
      /\/v1\/auth\/google\?returnTo=%2Fpaths$/,
    );
  });

  test('sign-out returns to /signin and Back does not reopen the account page', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    await page.goto('/today');
    await page.getByRole('link', { name: 'Account' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/signin$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/signin\?next=%2Ftoday$/);
  });

  test('session state never touches browser storage', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'Jane Doe' })).toBeVisible();
    const stored = await page.evaluate(() => ({
      local: Object.keys(localStorage).length,
      session: Object.keys(sessionStorage).length,
    }));
    expect(stored).toEqual({ local: 0, session: 0 });
  });
});
