import { expect, type Page } from '@playwright/test';
import { mockPath, mockPathSummary, mockProblem, mockProgress, mockProgressHistory } from '../src/api/mocks/data';
import { json, mockAuth, problem } from './api';

// U12a: the screens each part restyles, with realistic mock data. Used by contrast.spec.ts (axe in
// both themes, in the default run) and by screenshots/u12a.spec.ts (the review images).

export interface Screen {
  name: string;
  /** U12a parts whose review includes this screen. */
  parts: readonly number[];
  url: string;
  setup: (page: Page) => Promise<void>;
  ready: (page: Page) => Promise<void>;
  /** False for states that never mount the app shell (the fonts load from it). */
  fonts?: boolean;
}

const never = () => new Promise<never>(() => undefined);

async function signedInWithPath(page: Page) {
  await mockAuth(page, { signedIn: true });
  await page.route('**/v1/paths?*', (route) => json(route, 200, { items: [mockPathSummary], nextCursor: null }));
  await page.route('**/v1/paths/path-1', (route) => json(route, 200, mockPath));
  await page.route('**/v1/steps/*', (route) => json(route, 200, mockPath.steps[1]));
  await page.route('**/v1/progress', (route) => json(route, 200, mockProgress));
  await page.route('**/v1/progress/*/history', (route) => json(route, 200, mockProgressHistory));
  // YouTube stays offline: an empty thumbnail keeps the facade's own frame on screen.
  await page.route('https://i.ytimg.com/**', (route) => route.fulfill({ status: 200, contentType: 'image/jpeg', body: '' }));
}

const h1 = (name: string | RegExp) => async (page: Page) => {
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
};

export const SCREENS: readonly Screen[] = [
  {
    name: 'boot-splash-waking',
    parts: [1],
    url: '/today',
    setup: async (page) => {
      await page.route('**/v1/auth/me', never);
    },
    ready: async (page) => {
      await expect(page.getByText('Waking up the server…')).toBeVisible();
    },
    fonts: false,
  },
  {
    name: 'signin',
    parts: [1, 4],
    url: '/signin',
    setup: (page) => mockAuth(page, { signedIn: false }).then(() => undefined),
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i }).first()).toBeVisible();
    },
  },
  { name: 'today', parts: [1, 2], url: '/today', setup: signedInWithPath, ready: h1(mockPath.topic.canonicalName) },
  {
    name: 'today-loading-waking',
    parts: [1, 2],
    url: '/today',
    setup: async (page) => {
      await mockAuth(page, { signedIn: true });
      await page.route('**/v1/paths?*', never);
    },
    ready: async (page) => {
      await expect(page.getByRole('status', { name: /Loading/ })).toBeVisible();
      await expect(page.getByText('Waking up the server…')).toBeVisible();
    },
  },
  {
    name: 'today-error',
    parts: [1, 2],
    url: '/today',
    setup: async (page) => {
      await mockAuth(page, { signedIn: true });
      await page.route('**/v1/paths?*', (route) => problem(route, mockProblem(500, 'INTERNAL', 'Boom')));
    },
    ready: async (page) => {
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    },
  },
  { name: 'paths', parts: [1, 2], url: '/paths', setup: signedInWithPath, ready: h1(/paths/i) },
  {
    name: 'step',
    parts: [1, 2],
    url: '/steps/step-2?path=path-1',
    setup: signedInWithPath,
    ready: h1(mockPath.steps[1]?.objective ?? ''),
  },
  {
    name: 'step-toast',
    parts: [1, 2],
    url: '/steps/step-2?path=path-1',
    setup: signedInWithPath,
    ready: async (page) => {
      await page.getByRole('radio', { name: 'Too hard' }).click();
      await expect(page.getByRole('status').getByText('Thanks. We’ll adjust your next steps.')).toBeVisible();
    },
  },
  {
    name: 'quiz-options',
    parts: [1, 3],
    url: '/dev/quiz-lab',
    setup: async (page) => {
      await mockAuth(page, { signedIn: true });
    },
    ready: async (page) => {
      await page.getByRole('radio').nth(1).check();
      await expect(page.getByRole('radio').nth(1)).toBeChecked();
    },
  },
  { name: 'progress', parts: [1, 4], url: '/progress', setup: signedInWithPath, ready: h1(/progress/i) },
  {
    name: 'account',
    parts: [1, 4],
    url: '/account',
    setup: signedInWithPath,
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Your plan' })).toBeVisible();
    },
  },
];

/** Waits until the sketch fonts (declared after first paint) are in use. */
export async function waitForSketchFonts(page: Page) {
  await page.waitForFunction(() => document.fonts.check('16px Nunito') && document.fonts.check('30px Excalifont'), null, {
    timeout: 15_000,
  });
  await page.evaluate(() => document.fonts.ready);
}
