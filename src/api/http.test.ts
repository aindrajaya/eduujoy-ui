import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { createHttpClient, HttpError } from './http';
import { server } from './mocks/server';

const BASE = 'http://http.test';

describe('createHttpClient', () => {
  it('builds the URL with params (skipping empty ones) and sends JSON with cookies', async () => {
    let seen: { url: string; body: unknown; type: string | null; credentials: RequestCredentials } | undefined;
    server.use(
      http.post(`${BASE}/v1/things`, async ({ request }) => {
        seen = { url: request.url, body: await request.json(), type: request.headers.get('Content-Type'), credentials: request.credentials };
        return HttpResponse.json({ ok: true }, { status: 201, headers: { 'X-Request-Id': 'r1' } });
      }),
    );
    const client = createHttpClient({ baseURL: `${BASE}/`, withCredentials: true });
    const res = await client.post<{ ok: boolean }>('/v1/things', { a: 1 }, { params: { q: 'x y', n: 2, skip: undefined, none: null } });
    expect(res).toMatchObject({ status: 201, data: { ok: true }, headers: { 'x-request-id': 'r1' } });
    expect(seen).toEqual({ url: `${BASE}/v1/things?q=x+y&n=2`, body: { a: 1 }, type: 'application/json', credentials: 'include' });
  });

  it('reads empty, text and Blob bodies, and rejects non-2xx with the parsed problem', async () => {
    server.use(
      http.delete(`${BASE}/v1/me`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${BASE}/text`, () => HttpResponse.text('plain')),
      http.get(`${BASE}/file`, () => HttpResponse.json({ user: 1 })),
      http.get(`${BASE}/missing`, () => HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' })),
    );
    const client = createHttpClient({ baseURL: BASE });
    expect((await client.delete(`/v1/me`)).data).toBeUndefined();
    expect((await client.get('/text')).data).toBe('plain');
    expect((await client.get('/file', { responseType: 'blob' })).data).toBeInstanceOf(Blob);
    const error = await client.get('/missing').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ code: 'ERR_BAD_RESPONSE', response: { status: 404, data: { code: 'NOT_FOUND' } } });
  });

  it('tells a timeout, a cancellation and a network failure apart', async () => {
    server.use(
      http.get(`${BASE}/slow`, async () => {
        await delay(200);
        return HttpResponse.json({});
      }),
      http.get(`${BASE}/down`, () => HttpResponse.error()),
    );
    const client = createHttpClient({ baseURL: BASE, timeout: 20 });
    await expect(client.get('/slow')).rejects.toMatchObject({ code: 'ECONNABORTED' });
    const controller = new AbortController();
    const pending = client.get('/slow', { signal: controller.signal, timeout: 0 });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    await expect(client.get('/down')).rejects.toMatchObject({ code: 'ERR_NETWORK' });
  });

  it('runs request interceptors before sending and lets a response interceptor replay', async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/flaky`, ({ request }) => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({}, { status: 401 })
          : HttpResponse.json({ header: request.headers.get('X-Test') });
      }),
    );
    const client = createHttpClient({ baseURL: BASE });
    client.interceptors.request.use((config) => {
      config.headers.set('X-Test', 'yes');
      return config;
    });
    client.interceptors.response.use(undefined, (error: unknown) => {
      if (error instanceof HttpError && !error.config._retried) return client.request({ ...error.config, _retried: true });
      throw error;
    });
    await expect(client.get('/flaky')).resolves.toMatchObject({ data: { header: 'yes' } });
    expect(calls).toBe(2);
  });
});
