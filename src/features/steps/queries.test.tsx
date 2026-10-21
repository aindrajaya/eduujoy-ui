import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { mockPath, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import type { Path } from '@/api/types';
import { pathKeys } from '@/features/paths/keys';
import { createTestQueryClient, withQueryClient } from '@/test/providers';
import { getToasts, resetToasts } from '@/ui/toast/store';
import { applyPatch, useSendFeedback, useSwapResource, useUpdateStep } from './queries';

afterEach(() => {
  act(() => {
    resetToasts();
  });
});

function setup<T>(hook: () => T) {
  const client = createTestQueryClient();
  client.setQueryData(pathKeys.detail('path-1'), mockPath);
  const rendered = renderHook(hook, { wrapper: withQueryClient(client) });
  const step = (id: string) => client.getQueryData<Path>(pathKeys.detail('path-1'))?.steps.find((s) => s.id === id);
  return { client, step, ...rendered };
}

describe('applyPatch', () => {
  it('applies action ticks, difficulty and status', () => {
    const step = mockPath.steps[1]!;
    expect(applyPatch(step, { actionsDone: [{ n: 2, done: true }], difficulty: 'too_hard', status: 'completed' })).toMatchObject({
      status: 'completed',
      difficulty: 'too_hard',
      actions: [{ n: 1, done: false }, { n: 2, done: true }],
    });
    expect(applyPatch(step, {})).toEqual(step);
  });
});

describe('useUpdateStep', () => {
  it('updates the cached step at once, then with the server copy', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    server.use(
      http.patch('/v1/steps/{id}', async ({ response }) => {
        await gate;
        return response(200).json({ ...mockPath.steps[1]!, difficulty: 'too_hard' });
      }),
    );
    const { result, step } = setup(() => useUpdateStep('path-1'));
    act(() => {
      result.current.mutate({ stepId: 'step-2', patch: { difficulty: 'too_hard' } });
    });
    await waitFor(() => {
      expect(step('step-2')?.difficulty).toBe('too_hard');
    });
    release();
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('rolls back and shows a toast when saving fails', async () => {
    server.use(
      http.patch('/v1/steps/{id}', ({ response }) => response.untyped(problemResponse(mockProblem(500, 'INTERNAL', 'Boom')))),
    );
    const { result, step } = setup(() => useUpdateStep('path-1'));
    act(() => {
      result.current.mutate({ stepId: 'step-2', patch: { actionsDone: [{ n: 1, done: true }] } });
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(step('step-2')?.actions[0]?.done).toBe(false);
    expect(getToasts()[0]).toMatchObject({ title: 'Could not save that', tone: 'error' });
  });
});

describe('useSwapResource', () => {
  it('replaces the step with the server copy and confirms', async () => {
    const swapped = { ...mockPath.steps[1]!, resources: [{ ...mockPath.steps[1]!.resources[0]!, id: 'res-new', title: 'A fresh explainer' }] };
    server.use(http.post('/v1/resources/{id}/swap', ({ response }) => response(200).json(swapped)));
    const { result, step } = setup(() => useSwapResource('path-1'));
    act(() => {
      result.current.mutate({ resourceId: 'res-2-yt', stepId: 'step-2', reason: 'too long' });
    });
    await waitFor(() => {
      expect(step('step-2')?.resources[0]?.title).toBe('A fresh explainer');
    });
    expect(getToasts()[0]?.title).toBe('Swapped for another resource');
  });

  it('explains when no replacement exists, and other failures', async () => {
    server.use(
      http.post('/v1/resources/{id}/swap', ({ response }) =>
        response.untyped(problemResponse(mockProblem(409, 'NO_REPLACEMENT', 'None'))),
      ),
    );
    const { result } = setup(() => useSwapResource('path-1'));
    act(() => {
      result.current.mutate({ resourceId: 'res-2-yt', stepId: 'step-2' });
    });
    await waitFor(() => {
      expect(getToasts()[0]?.title).toBe('No other resource fits this step yet');
    });
    server.use(
      http.post('/v1/resources/{id}/swap', ({ response }) => response.untyped(problemResponse(mockProblem(500, 'INTERNAL', 'x')))),
    );
    act(() => {
      result.current.mutate({ resourceId: 'res-2-yt', stepId: 'step-2' });
    });
    await waitFor(() => {
      expect(getToasts().at(-1)?.title).toBe('Could not swap that resource');
    });
  });
});

describe('useSendFeedback', () => {
  it('posts thumbs feedback', async () => {
    const { result } = setup(() => useSendFeedback());
    act(() => {
      result.current.mutate({ targetType: 'resource', targetId: 'res-2-yt', kind: 'down' });
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
