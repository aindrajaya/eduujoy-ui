import { expect, test, type Page, type Route } from '@playwright/test';
import { mockPathJobEvents } from '../src/api/mocks/data';
import { toEventStreamText, type MockSseEvent } from '../src/api/mocks/sse';
import { mockAuth } from './api';

// U7 done-when: a reload mid-job resumes from Last-Event-ID (PRD-UI §11). The API replays every
// event after Last-Event-ID on connect, which the fake below mirrors.

const events = mockPathJobEvents as unknown as MockSseEvent[];

const fulfillSse = (route: Route, batch: readonly MockSseEvent[]) =>
  route.fulfill({
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    body: `: connected\n\n${toEventStreamText(batch)}`,
  });

const afterId = (id: string | undefined) => (id ? events.slice(events.findIndex((e) => e.id === id) + 1) : events);

/** Records each connection's Last-Event-ID; `plan` decides what each connection gets. */
async function mockJobStream(page: Page, plan: (connection: number, lastEventId: string | undefined, route: Route) => Promise<void>) {
  const lastEventIds: (string | undefined)[] = [];
  await page.route('**/v1/jobs/job-1/events', async (route) => {
    const lastEventId = route.request().headers()['last-event-id'];
    lastEventIds.push(lastEventId);
    try {
      await plan(lastEventIds.length, lastEventId, route);
    } catch {
      // The page reloaded while this connection was held open.
    }
  });
  return lastEventIds;
}

test.describe('generation progress (U7)', () => {
  test('a dropped stream reconnects with Last-Event-ID, then lands on Today when the path is ready', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    const lastEventIds = await mockJobStream(page, (n, last, route) =>
      // First connection drops after event 2; the reconnect gets the rest.
      fulfillSse(route, n === 1 ? events.slice(0, 2) : afterId(last)),
    );
    await page.goto('/paths/new/job-1');
    await expect(page).toHaveURL(/\/today$/);
    // exact: Radix also announces toasts in its own live region ("Notifications Your path is ready").
    await expect(page.getByText('Your path is ready', { exact: true })).toBeVisible();
    expect(lastEventIds).toEqual([undefined, '2']);
  });

  test('a reload mid-job shows the last progress at once and resumes from Last-Event-ID', async ({ page }) => {
    await mockAuth(page, { signedIn: true });
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const lastEventIds = await mockJobStream(page, async (n, last, route) => {
      if (n === 1) return fulfillSse(route, events.slice(0, 3)); // through the partial step
      if (n === 2) {
        await held; // the job is still running; this connection stays pending until the reload
        return;
      }
      return fulfillSse(route, afterId(last));
    });

    await page.goto('/paths/new/job-1');
    // route.fulfill cannot hold a stream open, so the page may already show "Reconnecting…" here;
    // the stage list still carries the progress.
    await expect(page.getByRole('listitem').filter({ hasText: 'Analysing resources' })).toContainText('4 of 6');
    await expect(page.getByText(/Step 1:/)).toBeVisible();

    // Hold the third connection until we have checked the resumed screen.
    let releaseThird: () => void = () => undefined;
    const third = new Promise<void>((resolve) => {
      releaseThird = resolve;
    });
    await page.unroute('**/v1/jobs/job-1/events');
    await page.route('**/v1/jobs/job-1/events', async (route) => {
      lastEventIds.push(route.request().headers()['last-event-id']);
      await third;
      await fulfillSse(route, afterId(route.request().headers()['last-event-id']));
    });

    await page.reload();
    // Restored from the resume point before any new event arrives.
    await expect(page.getByText('Analysing videos, 4 of 6')).toBeVisible();
    await expect(page.getByText(/Step 1:/)).toBeVisible();
    releaseThird();
    release();

    await expect(page).toHaveURL(/\/today$/);
    // The first connection started fresh; every later one carried the last id it had seen (3).
    expect(lastEventIds[0]).toBeUndefined();
    expect(lastEventIds.at(-1)).toBe('3');
  });
});
