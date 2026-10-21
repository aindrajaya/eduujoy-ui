import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { createApiClient, DEFAULT_TIMEOUT_MS } from './client';
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
