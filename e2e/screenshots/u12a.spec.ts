import { test } from '@playwright/test';
import { SCREENS, waitForSketchFonts } from '../screens';

// Reproducible review images: a fixed clock, mocked data, reduced motion (no pulse mid-frame), and
// the fonts loaded before the shot. Named <screen>-<width>-<theme>.png.
const PART = Number(process.env.U12A_PART ?? '1');
// Part 5 is U12b's review (rough.js), in its own folder.
const DIR = PART === 5 ? 'U12b' : `U12a-${String(PART)}`;
const FIXED_NOW = new Date('2026-10-23T09:00:00+07:00');
const HEIGHT: Record<number, number> = { 360: 740, 1280: 800 };

for (const screen of SCREENS.filter((s) => s.parts.includes(PART))) {
  for (const width of [360, 1280]) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${screen.name}-${String(width)}-${theme}`, async ({ page }) => {
        await page.clock.setFixedTime(FIXED_NOW);
        await page.setViewportSize({ width, height: HEIGHT[width] ?? 800 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await screen.setup(page);
        await page.goto(screen.url);
        await screen.ready(page);
        if (screen.fonts !== false) await waitForSketchFonts(page);
        // U12b: every rough.js layer has drawn (seeded, so the same image each run).
        await page.waitForFunction(() => [...document.querySelectorAll('svg.sk-rough')].every((svg) => svg.childElementCount > 0), null, {
          timeout: 15_000,
        });
        // A full-page capture freezes sticky and fixed bars where the first viewport ended, on top
        // of content. Growing the viewport to the page height puts them where they really sit.
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({ width, height: Math.max(height, HEIGHT[width] ?? 800) });
        await page.screenshot({
          path: `docs/screenshots/${DIR}/${screen.name}-${String(width)}-${theme}.png`,
          animations: 'disabled',
          caret: 'hide',
        });
      });
    }
  }
}
