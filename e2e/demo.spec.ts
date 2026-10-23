import { expect, test, type Page } from '@playwright/test';
import axe from 'axe-core';
import { mockAuth } from './api';

// UD done-when (PRD-UI §7b): 8–12 items, reload restores, double tap yields one result, a
// keyboard-only run passes, axe is clean in both themes, and /demo makes no request to the API or a
// third party.

const H1 = 'Find your starting point';

/** Every request the page makes, to prove /demo stays on its own static files. */
function watchRequests(page: Page) {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  return urls;
}

async function expectNoAxeViolations(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<{ violations: { id: string; nodes: unknown[] }[] }> } }).axe;
    const result = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
    return result.violations.map((v) => `${v.id} (${String(v.nodes.length)})`);
  });
  expect(violations).toEqual([]);
}

/**
 * The setup by keyboard: the topic (UD2), goal, weekly time and format (one screen each), then the
 * self-report. Each step: focus a radio card, pick with Space or an arrow, Enter on the step's button.
 */
async function selfReportByKeyboard(page: Page, topic = 'Learning science') {
  await page.getByRole('radio', { name: new RegExp(`^${topic}`) }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Continue' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 2, name: 'Step 2 of 5: Your goal' })).toBeFocused();
  for (const [first, step] of [
    ['Pass an exam', 'Step 3 of 5: Weekly time'],
    ['1–2 h', 'Step 4 of 5: Format'],
    ['Videos', 'Step 5 of 5: About you'],
  ] as const) {
    await page.getByRole('radio', { name: first }).focus();
    await page.keyboard.press('ArrowDown');
    await page.getByRole('button', { name: 'Continue' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 2, name: step })).toBeFocused();
  }
  await page.getByRole('radio', { name: 'Not yet' }).focus();
  await page.keyboard.press('ArrowDown'); // Under a year
  await page.getByRole('radio', { name: 'Yes' }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Start the diagnostic' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Question 1 of 4/)).toBeVisible();
}

/** Answers the visible question with the keyboard only; returns false once the result shows. */
async function answerByKeyboard(page: Page, n: number): Promise<boolean> {
  const result = page.getByRole('heading', { level: 1, name: 'Your starting point' });
  const question = page.getByText(/Question \d of \d/);
  await expect(result.or(question)).toBeVisible();
  if (await result.isVisible()) return false;

  const moveDown = page.getByRole('button', { name: /^Move .* down$/ });
  if (await moveDown.count()) {
    // C6: move the first block down twice; the focus stays on it.
    await moveDown.first().focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: /moved to position 3/ })).toBeAttached();
  } else if (n % 3 === 2) {
    // Every third question: "I don't know yet".
    await page.getByRole('button', { name: 'I don’t know yet' }).focus();
    await page.keyboard.press('Enter');
    return true;
  } else {
    // Single choice, multi choice or a linked pair: pick the first option of every group with Space.
    for (const group of await page.getByRole('main').locator('fieldset').all()) {
      await group.locator('input[type="radio"], input[type="checkbox"]').first().focus();
      await page.keyboard.press('Space');
    }
  }
  await page.getByRole('button', { name: /^(Next|Continue)$/ }).focus();
  await page.keyboard.press('Enter');
  return true;
}

test.describe('public demo (UD)', () => {
  test('a keyboard-only run takes 8–12 items, makes no API or third-party request and sets no cookie', async ({
    page,
    context,
    baseURL,
  }) => {
    const urls = watchRequests(page);
    await page.goto('/demo');
    await expect(page.getByRole('heading', { level: 1, name: H1 })).toBeVisible();
    await selfReportByKeyboard(page);

    let answered = 0;
    while (await answerByKeyboard(page, answered)) answered += 1;
    expect(answered).toBeGreaterThanOrEqual(8);
    expect(answered).toBeLessThanOrEqual(12);
    await expect(page.getByRole('table', { name: /Your demo placement/ })).toContainText('You are here');
    await expect(page.getByText(/This is a demo placement/)).toBeVisible();
    // The setup shaped the result: "Use it at work", 3–5 h, Reading.
    await expect(page.getByText(/Aimed at work/)).toBeVisible();
    await expect(page.getByText(/each step takes about 45 minutes/)).toBeVisible();
    await expect(page.getByText('Article · about 45 min')).toHaveCount(3);

    // Retake starts a fresh attempt.
    await page.getByRole('button', { name: 'Retake' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: H1 })).toBeVisible();

    const origin = new URL(baseURL ?? '').origin;
    const offending = urls.filter((url) => {
      const u = new URL(url);
      return u.origin !== origin || u.pathname.startsWith('/v1/') || u.pathname.startsWith('/socket.io');
    });
    expect(offending).toEqual([]);
    expect(urls.some((url) => /Nunito-latin-wght-.*\.woff2$/.test(url))).toBe(true);
    expect(await context.cookies()).toEqual([]);
  });

  test('a reload mid-quiz returns to the same question with its answers', async ({ page }) => {
    await page.goto('/demo');
    await selfReportByKeyboard(page);
    await page.getByRole('main').locator('fieldset').first().getByRole('radio').nth(1).check();
    const chosen = await page.getByRole('main').locator('fieldset').first().getByRole('radio').nth(1).getAttribute('value');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Question 2 of 4')).toBeVisible();
    // Drafts save 1 s after the last change.
    await page.waitForTimeout(1300);
    await page.reload();
    await expect(page.getByText('Question 2 of 4')).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('main').locator(`input[value="${chosen ?? ''}"]`)).toBeChecked();
  });

  test('a double tap on the last answer of a set records one result', async ({ page }) => {
    await page.goto('/demo');
    await selfReportByKeyboard(page);
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: 'I don’t know yet' }).click();
    await page.getByRole('button', { name: 'I don’t know yet' }).dblclick();
    await expect(page.getByText('4 of about 8 answered')).toBeVisible();
    const graded = await page.evaluate(() => {
      const attempt = JSON.parse(window.localStorage.getItem('demo:attempt') ?? '{}') as { graded?: unknown[] };
      return attempt.graded?.length;
    });
    expect(graded).toBe(4);
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`axe finds no violations, contrast included, in the ${colorScheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto('/demo');
      await expect(page.getByRole('heading', { level: 1, name: H1 })).toBeVisible();
      await expectNoAxeViolations(page);
      await selfReportByKeyboard(page);
      await expectNoAxeViolations(page);
      let n = 0;
      while (await answerByKeyboard(page, n)) n += 1;
      await page.getByText('Under the hood').click();
      await expectNoAxeViolations(page);
    });
  }

  test('a catalog topic (Python) runs by keyboard on its own bank, with no API request, and ends with sign-up', async ({
    page,
    baseURL,
  }) => {
    const urls = watchRequests(page);
    await page.goto('/demo');
    await expect(page.getByRole('heading', { level: 1, name: H1 })).toBeVisible();
    await selfReportByKeyboard(page, 'Python');
    await expect(page.getByRole('heading', { level: 1, name: 'Python' })).toBeVisible();
    let answered = 0;
    while (await answerByKeyboard(page, answered)) answered += 1;
    expect(answered).toBeGreaterThanOrEqual(8);
    await expect(page.getByText('Questions from Eduujoy’s reviewed item bank.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Build your real path on Eduujoy' })).toHaveAttribute('href', '/signup');
    await expectNoAxeViolations(page);
    const origin = new URL(baseURL ?? '').origin;
    expect(urls.filter((url) => new URL(url).origin !== origin || new URL(url).pathname.startsWith('/v1/'))).toEqual([]);
  });

  test('/signin does not fetch the sketch fonts', async ({ page }) => {
    await mockAuth(page, { signedIn: false });
    const urls = watchRequests(page);
    await page.goto('/signin');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(urls.filter((url) => url.endsWith('.woff2'))).toEqual([]);
  });
});
