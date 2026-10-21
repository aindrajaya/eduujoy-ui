import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockMe, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { createTestQueryClient, withQueryClient } from '@/test/providers';
import { useSignIn, useSignOut, useSignUp } from './queries';
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

  it('sign-out clears every cached query, even if logout fails', async () => {
    server.use(
      http.post('/v1/auth/logout', ({ response }) =>
        response.untyped(problemResponse(mockProblem(401, 'UNAUTHENTICATED', 'Already out'))),
      ),
    );
    const client = createTestQueryClient();
    client.setQueryData(sessionKeys.me(), mockMe);
    client.setQueryData(['paths', 'list'], { items: [] });
    const { result } = renderHook(() => useSignOut(), { wrapper: withQueryClient(client) });
    act(() => {
      result.current.mutate();
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});
