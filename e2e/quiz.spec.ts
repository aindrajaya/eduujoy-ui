import { expect, test, type Page } from '@playwright/test';
import { mockAuth } from './api';

// U5 done-when (PRD-UI §11): typing in a 50-question quiz keeps INP ≤ 200 ms. The quiz lab route
// exists only in the e2e build (--mode e2e). CPU is throttled 4x to approximate a mid-range phone.

declare global {
  interface Window {
    __eventTimings: { name: string; duration: number; interactionId: number }[];
  }
}

async function openLab(page: Page) {
  await page.addInitScript(() => {
    window.__eventTimings = [];
    new PerformanceObserver((list) => {
      // interactionId is in Chrome but not yet in TypeScript's DOM types.
      for (const entry of list.getEntries() as (PerformanceEventTiming & { interactionId: number })[]) {
        window.__eventTimings.push({ name: entry.name, duration: entry.duration, interactionId: entry.interactionId });
      }
    }).observe({ type: 'event', durationThreshold: 16, buffered: true } as PerformanceObserverInit);
  });
  await mockAuth(page, { signedIn: true });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('/dev/quiz-lab');
  await expect(page.getByText('Question 1 of 50')).toBeVisible();
}

/** INP for a page with fewer than 50 interactions is the slowest interaction. */
async function worstInteractionMs(page: Page): Promise<number> {
  const timings = await page.evaluate(() => window.__eventTimings.filter((e) => e.interactionId > 0));
  return Math.max(0, ...timings.map((e) => e.duration));
}

async function answerCurrent(page: Page, text = 'Interview five users') {
  const radio = page.getByRole('radio').first();
  const checkbox = page.getByRole('checkbox').first();
  if (await radio.isVisible()) await radio.check();
  else if (await checkbox.isVisible()) await checkbox.check();
  else await page.getByRole('textbox', { name: 'Your answer' }).fill(text);
  await page.getByRole('button', { name: /^(Next|Review answers)$/ }).click();
}

test.describe('quiz engine (U5)', () => {
  test('typing a long answer in a 50-question quiz keeps INP ≤ 200 ms (4x CPU throttle)', async ({ page }) => {
    await openLab(page);
    await answerCurrent(page); // Q1: single choice
    await expect(page.getByText('Question 2 of 50')).toBeVisible();

    const box = page.getByRole('textbox', { name: 'Your answer' });
    await box.click();
    await box.pressSequentially(
      'I would interview five recent users about why they churned, then cluster the reasons before deciding on a survey.',
      { delay: 15 },
    );

    const inp = await worstInteractionMs(page);
    console.log(`worst interaction while typing: ${inp} ms`);
    expect(inp).toBeLessThanOrEqual(200);
  });

  test('answers all 50, reviews in the virtual list and submits once', async ({ page }) => {
    test.setTimeout(120_000);
    await openLab(page);
    for (let i = 0; i < 50; i += 1) await answerCurrent(page);

    await expect(page.getByRole('heading', { name: 'Review your answers' })).toBeVisible();
    await expect(page.getByText('Everything is answered. Tap a question to change it.')).toBeVisible();
    const rows = await page.getByRole('list', { name: 'Your answers' }).locator('li').count();
    expect(rows).toBeLessThan(50);

    await page.getByRole('button', { name: 'Submit answers' }).click();
    await expect(page.getByText('Submitted 50 answers')).toBeVisible();
    expect(await worstInteractionMs(page)).toBeLessThanOrEqual(200);
  });

  test('a reload restores the draft (debounced 1 s) at the same question', async ({ page }) => {
    await openLab(page);
    await answerCurrent(page);
    await answerCurrent(page);
    await answerCurrent(page);
    await expect(page.getByText('Question 4 of 50')).toBeVisible();
    await page.waitForTimeout(1300);
    await page.reload();
    await expect(page.getByText('Question 4 of 50')).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('checkbox').first()).toBeChecked();
  });
});
