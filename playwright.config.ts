import { defineConfig, devices } from '@playwright/test';

const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;

// E2E runs against a production build whose VITE_API_URL is the preview origin, so page.route()
// serves the API same-origin from the contract mock data (e2e/api.ts). From U8 the same specs
// also run against the seeded staging API (PRD-UI §10).
export default defineConfig({
  testDir: 'e2e',
  // U12a review images run on their own (playwright.screenshots.config.ts).
  testIgnore: ['screenshots/**'],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: `pnpm build:e2e && pnpm exec vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_API_URL: BASE_URL },
  },
});
