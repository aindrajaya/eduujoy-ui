import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockMe, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { createTestQueryClient, withQueryClient } from '@/test/providers';
import { ApiError } from '@/api/errors';
import { shouldRetrySignOut, useSignIn, useSignOut, useSignUp } from './queries';
import { sessionKeys } from './session';

describe('auth mutations', () => {
  it('sign-in stores the session in the query cache', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSignIn(), { wrapper: withQueryClient(client) });
    act(() => {
      result.current.mutate({ email: 'jane@example.com', password: 'correct-horse' });
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(client.getQueryData(sessionKeys.me())).toEqual(mockMe);
  });

  it('sign-in exposes the ApiError on wrong credentials', async () => {
    server.use(
      http.post('/v1/auth/login', ({ response }) =>
        response.untyped(problemResponse(mockProblem(401, 'UNAUTHENTICATED', 'Invalid credentials'))),
      ),
    );
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSignIn(), { wrapper: withQueryClient(client) });
    act(() => {
      result.current.mutate({ email: 'jane@example.com', password: 'nope' });
    });
    await waitFor(() => {
      expect(result.current.error).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    });
    expect(client.getQueryData(sessionKeys.me())).toBeUndefined();
  });

  it('sign-up stores the session', async () => {
    const client = createTestQueryClient();
    const { result } = renderHook(() => useSignUp(), { wrapper: withQueryClient(client) });
    act(() => {
      result.current.mutate({ email: 'new@example.com', password: 'long-enough-pw' });
    });
    await waitFor(() => {
      expect(client.getQueryData(sessionKeys.me())).toEqual(mockMe);
    });
  });

  // Contract 0.1.1: logout always answers 204, so the only failure left is the network.
  it('sign-out clears every cached query and records signed out, even if logout never arrives', async () => {
    let calls = 0;
    server.use(
      http.post('/v1/auth/logout', ({ response }) => {
        calls += 1;
        return response.untyped(Response.error());
      }),
    );
    const client = createTestQueryClient();
    client.setQueryData(sessionKeys.me(), mockMe);
    client.setQueryData(['paths', 'list'], { items: [] });
    const { result } = renderHook(() => useSignOut(), { wrapper: withQueryClient(client) });
    act(() => {
      result.current.mutate();
    });
    // Two retries at 0.5 s and 1 s come first.
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryCache().getAll().map((q) => q.queryKey)).toEqual([sessionKeys.me()]);
    expect(client.getQueryData(sessionKeys.me())).toBeNull();
    // One attempt plus two retries.
    expect(calls).toBe(3);
  });
});

describe('shouldRetrySignOut', () => {
  const err = (status: number) => new ApiError({ status, code: status ? 'INTERNAL' : 'NETWORK_ERROR', title: 't' });

  it('retries network and 5xx failures twice, never 4xx', () => {
    expect(shouldRetrySignOut(0, err(0))).toBe(true);
    expect(shouldRetrySignOut(1, err(503))).toBe(true);
    expect(shouldRetrySignOut(2, err(0))).toBe(false);
    expect(shouldRetrySignOut(0, err(403))).toBe(false);
  });
});
