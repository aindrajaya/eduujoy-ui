import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { createApiClient, DEFAULT_TIMEOUT_MS } from './client';
import { CONCURRENT_REFRESH_SETTLE_MS } from './interceptors';
import { ApiError } from './errors';
import { server } from './mocks/server';

// A separate origin keeps these handlers apart from the default contract mocks.
const BASE = 'http://api.test';

const unauthorized = () =>
  HttpResponse.json(
    {
      type: `${BASE}/problems/unauthenticated`,
      title: 'Unauthenticated',
      status: 401,
      code: 'UNAUTHENTICATED',
      requestId: 'r1',
    },
    { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
  );

/** A protected resource that 401s until `refreshed()` returns true. */
function protectedRoute(refreshed: () => boolean, seen: string[]) {
  return http.get(`${BASE}/v1/paths/:id`, ({ params }) => {
    seen.push(String(params.id));
    return refreshed() ? HttpResponse.json({ id: params.id }) : unauthorized();
  });
}

describe('createApiClient', () => {
  it('sends credentials, a request id and the CSRF header', async () => {
    let headers: Headers | undefined;
    server.use(
      http.get(`${BASE}/v1/auth/me`, ({ request }) => {
        headers = request.headers;
        return HttpResponse.json({});
      }),
    );
    const api = createApiClient({ baseURL: BASE });
    await api.get('/v1/auth/me');
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.timeout).toBe(DEFAULT_TIMEOUT_MS);
    expect(headers?.get('x-requested-with')).toBe('eduujoy');
    expect(headers?.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('keeps a caller-supplied request id', async () => {
    let id: string | null = null;
    server.use(
      http.get(`${BASE}/health`, ({ request }) => {
        id = request.headers.get('x-request-id');
        return HttpResponse.json({ status: 'ok' });
      }),
    );
    await createApiClient({ baseURL: BASE }).get('/health', { headers: { 'X-Request-Id': 'mine' } });
    expect(id).toBe('mine');
  });

  it('runs a single refresh for 5 parallel 401s and replays each request once', async () => {
    let refreshed = false;
    let refreshCalls = 0;
    const seen: string[] = [];
    server.use(
      protectedRoute(() => refreshed, seen),
      http.post(`${BASE}/v1/auth/refresh`, async () => {
        refreshCalls += 1;
        await new Promise((r) => setTimeout(r, 20));
        refreshed = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const api = createApiClient({ baseURL: BASE });

    const ids = ['a', 'b', 'c', 'd', 'e'];
    const results = await Promise.all(ids.map((id) => api.get<{ id: string }>(`/v1/paths/${id}`)));

    expect(refreshCalls).toBe(1);
    expect(results.map((r) => r.data.id)).toEqual(ids);
    // Each id was requested exactly twice: the 401 and the replay.
    for (const id of ids) expect(seen.filter((s) => s === id)).toHaveLength(2);
  });

  it('starts a new refresh for a later 401 once the first has settled', async () => {
    let refreshCalls = 0;
    let valid = false;
    server.use(
      protectedRoute(() => valid, []),
      http.post(`${BASE}/v1/auth/refresh`, () => {
        refreshCalls += 1;
        valid = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const api = createApiClient({ baseURL: BASE });
    await api.get('/v1/paths/1');
    valid = false;
    await api.get('/v1/paths/2');
    expect(refreshCalls).toBe(2);
  });

  it('reports session expiry once and rejects every waiter when refresh fails', async () => {
    const onSessionExpired = vi.fn();
    server.use(
      protectedRoute(() => false, []),
      http.post(`${BASE}/v1/auth/refresh`, unauthorized),
    );
    const api = createApiClient({ baseURL: BASE, onSessionExpired });

    const results = await Promise.allSettled(
      ['a', 'b', 'c', 'd', 'e'].map((id) => api.get(`/v1/paths/${id}`)),
    );

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    for (const r of results) {
      if (r.status === 'rejected') expect(r.reason).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    }
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(onSessionExpired.mock.calls[0]?.[0]).toMatchObject({ url: '/v1/paths/a' });
  });

  it('treats 409 REFRESH_CONCURRENT as a completed refresh and replays without signing out', async () => {
    // Another tab rotated the refresh token first; the API leaves our (already rotated) cookies alone.
    let otherTabRotated = false;
    let refreshCalls = 0;
    const seen: string[] = [];
    const onSessionExpired = vi.fn();
    server.use(
      protectedRoute(() => otherTabRotated, seen),
      http.post(`${BASE}/v1/auth/refresh`, () => {
        refreshCalls += 1;
        otherTabRotated = true;
        return HttpResponse.json(
          {
            type: `${BASE}/problems/refresh-concurrent`,
            title: 'Refresh already in progress',
            status: 409,
            code: 'REFRESH_CONCURRENT',
            requestId: 'r409',
          },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        );
      }),
    );
    const api = createApiClient({ baseURL: BASE, onSessionExpired });

    const results = await Promise.all(['a', 'b', 'c'].map((id) => api.get<{ id: string }>(`/v1/paths/${id}`)));

    expect(results.map((r) => r.data.id)).toEqual(['a', 'b', 'c']);
    expect(refreshCalls).toBe(1);
    expect(onSessionExpired).not.toHaveBeenCalled();
    for (const id of ['a', 'b', 'c']) expect(seen.filter((s) => s === id)).toHaveLength(2);
  });

  it('two tabs: parallel 401s whose refreshes get 204 and 409 both succeed', async () => {
    // A tiny cookie jar shared by two tabs. Tab A rotates the token (204); tab B's refresh of the
    // same token lands inside the grace window (409) and must wait, then replay with A's cookies.
    let rotated = false;
    let refreshCalls = 0;
    server.use(
      http.get(`${BASE}/v1/paths/:id`, ({ params }) =>
        rotated ? HttpResponse.json({ id: params.id }) : unauthorized(),
      ),
      http.post(`${BASE}/v1/auth/refresh`, async () => {
        refreshCalls += 1;
        if (refreshCalls === 1) {
          await new Promise((r) => setTimeout(r, 30));
          rotated = true;
          return new HttpResponse(null, { status: 204 });
        }
        return HttpResponse.json(
          { type: 'x', title: 'Concurrent', status: 409, code: 'REFRESH_CONCURRENT', requestId: 'r' },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        );
      }),
    );
    const onSessionExpired = vi.fn();
    const tabA = createApiClient({ baseURL: BASE, onSessionExpired });
    const tabB = createApiClient({ baseURL: BASE, onSessionExpired });

    const started = Date.now();
    const [a, b] = await Promise.all([tabA.get<{ id: string }>('/v1/paths/a'), tabB.get<{ id: string }>('/v1/paths/b')]);

    expect([a.data.id, b.data.id]).toEqual(['a', 'b']);
    expect(refreshCalls).toBe(2);
    expect(onSessionExpired).not.toHaveBeenCalled();
    // Tab B waited for tab A's Set-Cookie before replaying.
    expect(Date.now() - started).toBeGreaterThanOrEqual(CONCURRENT_REFRESH_SETTLE_MS - 10);
  });

  it('treats a 401 on the replay after a 409 as signed out, reported once, with no loop', async () => {
    let refreshCalls = 0;
    const onSessionExpired = vi.fn();
    server.use(
      protectedRoute(() => false, []),
      http.post(`${BASE}/v1/auth/refresh`, () => {
        refreshCalls += 1;
        return HttpResponse.json(
          { type: 'x', title: 'Concurrent', status: 409, code: 'REFRESH_CONCURRENT', requestId: 'r' },
          { status: 409 },
        );
      }),
    );
    const api = createApiClient({ baseURL: BASE, onSessionExpired });
    const results = await Promise.allSettled(['x', 'y'].map((id) => api.get(`/v1/paths/${id}`)));
    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(refreshCalls).toBe(1);
    expect(onSessionExpired).toHaveBeenCalledOnce();
  });

  it('does not treat other 409s from refresh as success', async () => {
    server.use(
      protectedRoute(() => false, []),
      http.post(`${BASE}/v1/auth/refresh`, () =>
        HttpResponse.json({ type: 'x', title: 'Conflict', status: 409, code: 'CONFLICT', requestId: 'r' }, { status: 409 }),
      ),
    );
    await expect(createApiClient({ baseURL: BASE }).get('/v1/paths/x')).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
    });
  });

  it('does not refresh twice when the replay is also 401', async () => {
    let refreshCalls = 0;
    server.use(
      protectedRoute(() => false, []),
      http.post(`${BASE}/v1/auth/refresh`, () => {
        refreshCalls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const api = createApiClient({ baseURL: BASE });
    await expect(api.get('/v1/paths/x')).rejects.toBeInstanceOf(ApiError);
    expect(refreshCalls).toBe(1);
  });

  it.each(['/v1/auth/login', '/v1/auth/register', '/v1/auth/logout'])(
    'does not refresh on a 401 from %s',
    async (url) => {
      const refresh = vi.fn(() => new HttpResponse(null, { status: 204 }));
      server.use(http.post(`${BASE}${url}`, unauthorized), http.post(`${BASE}/v1/auth/refresh`, refresh));
      await expect(createApiClient({ baseURL: BASE }).post(url)).rejects.toMatchObject({ status: 401 });
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it('refreshes for /v1/auth/me so a cold start with an expired access cookie recovers', async () => {
    let refreshed = false;
    server.use(
      http.get(`${BASE}/v1/auth/me`, () => (refreshed ? HttpResponse.json({ ok: true }) : unauthorized())),
      http.post(`${BASE}/v1/auth/refresh`, () => {
        refreshed = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const res = await createApiClient({ baseURL: BASE }).get('/v1/auth/me');
    expect(res.data).toEqual({ ok: true });
  });

  it('never refreshes for 401 REAUTH_REQUIRED and does not report a sign-out (contract 0.6.0)', async () => {
    const onSessionExpired = vi.fn();
    let refreshes = 0;
    server.use(
      http.delete(`${BASE}/v1/me`, () =>
        HttpResponse.json(
          { type: 'x', title: 'Sign in again', status: 401, code: 'REAUTH_REQUIRED', requestId: 'r7' },
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
      http.post(`${BASE}/v1/auth/refresh`, () => {
        refreshes += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const api = createApiClient({ baseURL: BASE, onSessionExpired });
    await expect(api.delete('/v1/me')).rejects.toMatchObject({ status: 401, code: 'REAUTH_REQUIRED' });
    expect(refreshes).toBe(0);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('does not report session expiry when refresh fails for network reasons', async () => {
    const onSessionExpired = vi.fn();
    server.use(
      protectedRoute(() => false, []),
      http.post(`${BASE}/v1/auth/refresh`, () => HttpResponse.error()),
    );
    const api = createApiClient({ baseURL: BASE, onSessionExpired });
    await expect(api.get('/v1/paths/a')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('maps non-401 failures straight to ApiError', async () => {
    server.use(
      http.get(`${BASE}/v1/progress`, () =>
        HttpResponse.json(
          { type: 'x', title: 'Forbidden', status: 403, code: 'FORBIDDEN', requestId: 'r9' },
          { status: 403 },
        ),
      ),
    );
    await expect(createApiClient({ baseURL: BASE }).get('/v1/progress')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      requestId: 'r9',
    });
  });
});
