import { test } from '@playwright/test';
import { SCREENS, waitForSketchFonts } from '../screens';

// Reproducible review images: a fixed clock, mocked data, reduced motion (no pulse mid-frame), and
// the fonts loaded before the shot. Named <screen>-<width>-<theme>.png.
const PART = Number(process.env.U12A_PART ?? '1');
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
        await page.screenshot({
          path: `docs/screenshots/U12a-${String(PART)}/${screen.name}-${String(width)}-${theme}.png`,
          fullPage: true,
          animations: 'disabled',
          caret: 'hide',
        });
      });
    }
  }
}
