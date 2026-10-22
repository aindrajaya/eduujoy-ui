import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// U12a review images (not part of the test run): `U12A_PART=<n> pnpm screenshots` writes every
// screen of that part at 360 and 1280 px, light and dark, to docs/screenshots/U12a-<n>/.
export default defineConfig({
  ...base,
  testDir: 'e2e/screenshots',
  testIgnore: [],
  retries: 0,
  projects: [{ name: 'screens', use: { channel: 'chrome', deviceScaleFactor: 1 } }],
});
