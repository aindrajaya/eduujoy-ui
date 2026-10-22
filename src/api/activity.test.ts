import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { getPendingSince, requestFinished, requestStarted, subscribeActivity } from './activity';
import { createApiClient } from './client';
import { server } from './mocks/server';

const BASE = 'http://activity.test';

describe('activity store', () => {
  it('tracks when a run of overlapping requests began', () => {
    const seen: (number | null)[] = [];
    const unsubscribe = subscribeActivity(() => seen.push(getPendingSince()));
    requestStarted(100);
    requestStarted(200);
    requestFinished();
    expect(getPendingSince()).toBe(100);
    requestFinished();
    expect(getPendingSince()).toBeNull();
    requestFinished(); // extra finishes are ignored
    unsubscribe();
    expect(seen).toEqual([100, 100, 100, null]);
  });
});

describe('client request tracking', () => {
  it('is pending while a request is in flight and clear afterwards, including a refresh replay', async () => {
    let refreshed = false;
    let pendingDuringRequest: number | null = null;
    server.use(
      http.get(`${BASE}/v1/progress`, () => {
        pendingDuringRequest = getPendingSince();
        return refreshed
          ? HttpResponse.json({ items: [] })
          : HttpResponse.json(
              { type: 'x', title: 'Unauthenticated', status: 401, code: 'UNAUTHENTICATED', requestId: 'r' },
              { status: 401 },
            );
      }),
      http.post(`${BASE}/v1/auth/refresh`, () => {
        refreshed = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await createApiClient({ baseURL: BASE }).get('/v1/progress');
    expect(pendingDuringRequest).not.toBeNull();
    expect(getPendingSince()).toBeNull();
  });

  it('clears after a failed request', async () => {
    server.use(http.get(`${BASE}/v1/progress`, () => HttpResponse.error()));
    await expect(createApiClient({ baseURL: BASE }).get('/v1/progress')).rejects.toBeDefined();
    expect(getPendingSince()).toBeNull();
  });
});
