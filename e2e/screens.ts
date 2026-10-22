import { expect, type Page } from '@playwright/test';
import {
  mockCheckpointFailed,
  mockDiagnosticBatch,
  mockDiagnosticCompleted,
  mockGradeJobEvents,
  mockPath,
  mockPathJobEvents,
  mockPathSummary,
  mockProblem,
  mockProgress,
  mockProgressHistory,
  mockTopic,
} from '../src/api/mocks/data';
import { toEventStreamText, type MockSseEvent } from '../src/api/mocks/sse';
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

/** A neutral 16:9 stand-in for a YouTube thumbnail (test data only, never shipped). */
const THUMBNAIL = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">
<rect width="480" height="270" fill="#5c6b7a"/><rect x="40" y="40" width="180" height="190" fill="#8a9aa9"/>
<rect x="250" y="70" width="190" height="20" fill="#c9d3dc"/><rect x="250" y="110" width="150" height="14" fill="#c9d3dc"/>
<rect x="250" y="140" width="170" height="14" fill="#c9d3dc"/></svg>`;

/** The paths list: the active mock path, a completed one and one being checked. */
const PATH_LIST = [
  mockPathSummary,
  {
    ...mockPathSummary,
    id: 'path-2',
    status: 'completed' as const,
    topic: { ...mockPathSummary.topic, id: 'sql-basics', canonicalName: 'SQL for analysts' },
    stepsDone: 6,
    stepsTotal: 6,
  },
  {
    ...mockPathSummary,
    id: 'path-3',
    status: 'under_review' as const,
    topic: { ...mockPathSummary.topic, id: 'public-speaking', canonicalName: 'Public speaking' },
    stepsDone: 0,
  },
];

async function signedInWithPath(page: Page) {
  await mockAuth(page, { signedIn: true });
  await page.route('**/v1/paths?*', (route) => json(route, 200, { items: [mockPathSummary], nextCursor: null }));
  await page.route('**/v1/paths', (route) => json(route, 200, { items: PATH_LIST, nextCursor: null }));
  await page.route('**/v1/paths/path-1', (route) => json(route, 200, mockPath));
  await page.route('**/v1/steps/*', (route) => json(route, 200, mockPath.steps[1]));
  await page.route('**/v1/progress', (route) => json(route, 200, mockProgress));
  await page.route('**/v1/progress/*/history', (route) => json(route, 200, mockProgressHistory));
  // YouTube stays offline: a local placeholder stands in for the thumbnail, so the facade looks real.
  await page.route('https://i.ytimg.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: THUMBNAIL }),
  );
}

const sse = (events: readonly MockSseEvent[]) => ({
  status: 200,
  headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  body: `: connected\n\n${toEventStreamText(events)}`,
});

async function intake(page: Page) {
  await mockAuth(page, { signedIn: true });
  await page.route('**/v1/topics/resolve', (route) =>
    json(route, 200, {
      status: 'choices',
      choices: [
        { id: 'java-lang', canonicalName: 'Java (programming language)', description: 'The JVM language', similarity: 0.84 },
        { id: 'javascript', canonicalName: 'JavaScript', similarity: 0.81 },
        { id: 'java-coffee', canonicalName: 'Java coffee', similarity: 0.76 },
      ],
    }),
  );
}

async function openIntake(page: Page) {
  await page.getByRole('button', { name: /get started/i }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Let’s get started' })).toBeVisible();
}

/** A checkpoint graded over SSE; `events` decides how far grading has got. */
async function checkpointGraded(page: Page, events: readonly MockSseEvent[]) {
  await signedInWithPath(page);
  let connections = 0;
  await page.route('**/v1/jobs/grade-1/events', (route) => {
    connections += 1;
    return connections > 1 ? never() : route.fulfill(sse(events));
  });
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
  {
    name: 'paths',
    parts: [1, 2],
    url: '/paths',
    setup: signedInWithPath,
    ready: async (page) => {
      await expect(page.getByRole('link', { name: /Public speaking/ })).toBeVisible();
    },
  },
  {
    name: 'paths-empty',
    parts: [2],
    url: '/paths',
    setup: async (page) => {
      await mockAuth(page, { signedIn: true });
      await page.route('**/v1/paths', (route) => json(route, 200, { items: [], nextCursor: null }));
    },
    ready: async (page) => {
      await expect(page.getByText('No paths yet')).toBeVisible();
    },
  },
  {
    name: 'path',
    parts: [2],
    url: '/paths/path-1',
    setup: signedInWithPath,
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1, name: mockPath.topic.canonicalName })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Steps' }).getByRole('listitem')).toHaveCount(6);
    },
  },
  {
    name: 'today-empty',
    parts: [2],
    url: '/today',
    setup: async (page) => {
      await mockAuth(page, { signedIn: true });
      await page.route('**/v1/paths?*', (route) => json(route, 200, { items: [], nextCursor: null }));
    },
    ready: async (page) => {
      await expect(page.getByText('No active path yet')).toBeVisible();
    },
  },
  {
    name: 'generation-reconnecting',
    parts: [2],
    url: '/paths/new/job-1',
    setup: async (page) => {
      await mockAuth(page, { signedIn: true });
      // Two stages in, then the stream drops and the reconnect waits: staged progress, reconnecting.
      let connections = 0;
      await page.route('**/v1/jobs/job-1/events', (route) => {
        connections += 1;
        if (connections > 1) return never();
        const first = (mockPathJobEvents as unknown as MockSseEvent[]).slice(0, 2);
        return route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
          body: `: connected\n\n${toEventStreamText(first)}`,
        });
      });
    },
    ready: h1('Building your path…'),
  },
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
  {
    name: 'start-welcome',
    parts: [3],
    url: '/start',
    setup: intake,
    ready: h1('Welcome to Eduujoy'),
  },
  { name: 'start-intake', parts: [3], url: '/start', setup: intake, ready: openIntake },
  {
    name: 'start-intake-errors',
    parts: [3],
    url: '/start',
    setup: intake,
    ready: async (page) => {
      await openIntake(page);
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(page.getByText('Choose the option closest to you.')).toBeVisible();
    },
  },
  {
    name: 'start-topic-choices',
    parts: [3],
    url: '/start',
    setup: intake,
    ready: async (page) => {
      await openIntake(page);
      await page.getByLabel('What do you want to learn?').fill('java');
      await page.getByLabel("What's your goal?").fill('Get a backend job');
      await page.getByRole('radio', { name: 'I’m new to this' }).check();
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByRole('radio', { name: /^JavaScript/ }).check();
      await expect(page.getByRole('heading', { level: 1, name: 'Which topic did you mean?' })).toBeVisible();
    },
  },
  {
    name: 'diagnostic-question',
    parts: [3],
    url: '/diagnostic/diag-1',
    setup: async (page) => {
      await mockAuth(page, { signedIn: true });
      await page.route('**/v1/diagnostics/diag-1', (route) =>
        json(route, 200, { ...mockDiagnosticBatch, topic: mockTopic, createdAt: '2026-10-23T08:00:00Z', completedAt: null }),
      );
    },
    ready: async (page) => {
      await page.getByRole('radio').nth(1).check();
      await expect(page.getByRole('progressbar', { name: 'Diagnostic progress' })).toBeVisible();
    },
  },
  {
    name: 'diagnostic-placement',
    parts: [3],
    url: '/diagnostic/diag-1',
    setup: async (page) => {
      await mockAuth(page, { signedIn: true });
      await page.route('**/v1/diagnostics/diag-1', (route) =>
        json(route, 200, { ...mockDiagnosticCompleted, topic: mockTopic, createdAt: '2026-10-23T08:00:00Z', completedAt: '2026-10-23T08:06:00Z' }),
      );
    },
    ready: async (page) => {
      await expect(page.getByText('Diagnostic complete')).toBeVisible();
    },
  },
  {
    name: 'checkpoint-question',
    parts: [3],
    url: '/checkpoints/step-2?path=path-1',
    setup: signedInWithPath,
    ready: async (page) => {
      await page.getByRole('radio', { name: 'Interviews' }).check();
    },
  },
  {
    name: 'checkpoint-grading',
    parts: [3],
    url: '/checkpoints/step-2?path=path-1&job=grade-1',
    setup: (page) => checkpointGraded(page, (mockGradeJobEvents as unknown as MockSseEvent[]).slice(0, 2)),
    ready: h1('Grading your answers'),
  },
  {
    name: 'checkpoint-passed',
    parts: [3],
    url: '/checkpoints/step-2?path=path-1&job=grade-1',
    setup: (page) => checkpointGraded(page, mockGradeJobEvents),
    ready: h1('You passed this checkpoint'),
  },
  {
    name: 'checkpoint-not-passed',
    parts: [3],
    url: '/checkpoints/step-2?path=path-1&job=grade-1',
    setup: (page) =>
      checkpointGraded(page, [
        { id: '1', event: 'completed', data: { jobId: 'grade-1', resultRef: '/v1/checkpoints/step-2/submissions/sub-2', result: mockCheckpointFailed } },
      ] as unknown as MockSseEvent[]),
    ready: h1('Not passed yet'),
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
