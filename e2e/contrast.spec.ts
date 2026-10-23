import { expect, test } from '@playwright/test';
import axe from 'axe-core';
import { SCREENS, waitForSketchFonts } from './screens';

// U12a: every restyled screen passes axe, colour contrast included, in the light and the dark theme
// (WCAG 2.2 AA). jsdom cannot compute contrast, so this runs in the browser.

const RESTYLED_PARTS = [1, 2, 3, 4];

for (const screen of SCREENS.filter((s) => s.parts.some((p) => RESTYLED_PARTS.includes(p)))) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`${screen.name}: axe clean, contrast included, ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await screen.setup(page);
      await page.goto(screen.url);
      await screen.ready(page);
      if (screen.fonts !== false) await waitForSketchFonts(page);
      await page.addScriptTag({ content: axe.source });
      const violations = await page.evaluate(async () => {
        const run = (window as unknown as { axe: { run: (ctx: Document, opts: object) => Promise<{ violations: { id: string; nodes: { target: unknown }[] }[] }> } }).axe.run;
        const result = await run(document, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        });
        return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => JSON.stringify(n.target)).join(', ')}`);
      });
      expect(violations).toEqual([]);
    });
  }
}
