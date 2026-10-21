import { describe, expect, it } from 'vitest';
import { ApiError, type ApiErrorCode } from '@/api/errors';
import { mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { getProgress } from '@/api/endpoints/progress';
import { createQueryClient, retryDelay, shouldRetry } from './query-client';

const err = (status: number, code: ApiErrorCode = 'INTERNAL', retryAfterMs?: number) =>
  new ApiError({ status, code, title: 't', retryAfterMs });

describe('shouldRetry', () => {
  it('retries network errors, timeouts, 5xx, 408 and 429 up to twice', () => {
    for (const e of [err(0, 'NETWORK_ERROR'), err(0, 'TIMEOUT'), err(503), err(408), err(429, 'RATE_LIMITED')]) {
      expect(shouldRetry(0, e)).toBe(true);
      expect(shouldRetry(1, e)).toBe(true);
      expect(shouldRetry(2, e)).toBe(false);
    }
  });

  it('never retries other 4xx or cancellations', () => {
    for (const e of [err(400), err(401), err(403), err(404), err(409), err(0, 'CANCELED')]) {
      expect(shouldRetry(0, e)).toBe(false);
    }
  });
});

describe('retryDelay', () => {
  it('honours Retry-After, capped at 30 s', () => {
    expect(retryDelay(0, err(429, 'RATE_LIMITED', 2500))).toBe(2500);
    expect(retryDelay(0, err(429, 'RATE_LIMITED', 120_000))).toBe(30_000);
  });

  it('backs off exponentially otherwise', () => {
    expect(retryDelay(0, err(503))).toBe(1000);
    expect(retryDelay(1, err(503))).toBe(2000);
    expect(retryDelay(10, err(503))).toBe(30_000);
  });
});

describe('createQueryClient', () => {
  it('applies the PRD-UI §5 defaults', () => {
    const { queries, mutations } = createQueryClient().getDefaultOptions();
    expect(queries).toMatchObject({ staleTime: 30_000, gcTime: 300_000, refetchOnWindowFocus: true });
    expect(mutations?.retry).toBe(0);
  });

  it('retries a 429 query after Retry-After and then succeeds', async () => {
    let calls = 0;
    server.use(
      http.get('/v1/progress', ({ response }) => {
        calls += 1;
        return calls === 1
          ? response.untyped(
              problemResponse(mockProblem(429, 'RATE_LIMITED', 'Slow down'), { 'Retry-After': '0' }),
            )
          : response(200).json({ items: [] });
      }),
    );
    const data = await createQueryClient().query({ queryKey: ['progress'], queryFn: getProgress });
    expect(data).toEqual({ items: [] });
    expect(calls).toBe(2);
  });

  it('does not retry a 404 query', async () => {
    let calls = 0;
    server.use(
      http.get('/v1/progress', ({ response }) => {
        calls += 1;
        return response.untyped(problemResponse(mockProblem(404, 'NOT_FOUND', 'Nope')));
      }),
    );
    await expect(
      createQueryClient().query({ queryKey: ['progress'], queryFn: getProgress }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(calls).toBe(1);
  });
});
