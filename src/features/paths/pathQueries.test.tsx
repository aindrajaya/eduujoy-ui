import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockPath } from '@/api/mocks/data';
import { http } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { createTestQueryClient, withQueryClient } from '@/test/providers';
import { currentStep, findStep, stepHref, useActivePaths, usePath, usePaths } from './pathQueries';

const wrapper = () => withQueryClient(createTestQueryClient());

describe('path queries', () => {
  it('lists paths', async () => {
    const { result } = renderHook(() => usePaths(), { wrapper: wrapper() });
    await waitFor(() => {
      expect(result.current.data?.map((p) => p.id)).toEqual(['path-1']);
    });
  });

  it('asks for active paths and filters client-side when the API ignores the filter', async () => {
    let query = '';
    server.use(
      http.get('/v1/paths', ({ request, response }) => {
        query = new URL(request.url).search;
        return response(200).json({ items: [mockPath, { ...mockPath, id: 'old', status: 'completed' }], nextCursor: null });
      }),
    );
    const { result } = renderHook(() => useActivePaths(), { wrapper: wrapper() });
    await waitFor(() => {
      expect(result.current.data?.map((p) => p.id)).toEqual(['path-1']);
    });
    expect(query).toBe('?status=active');
  });

  it('loads a path, and stays idle without an id', async () => {
    const { result } = renderHook(() => usePath('path-1'), { wrapper: wrapper() });
    await waitFor(() => {
      expect(result.current.data?.steps).toHaveLength(6);
    });
    const idle = renderHook(() => usePath(undefined), { wrapper: wrapper() });
    expect(idle.result.current.fetchStatus).toBe('idle');
  });

  it('finds steps and the current step', () => {
    expect(findStep(mockPath, 'step-3')?.n).toBe(3);
    expect(findStep(undefined, 'step-3')).toBeUndefined();
    expect(currentStep(mockPath)?.id).toBe('step-2');
    const noActive = { ...mockPath, steps: mockPath.steps.map((s) => ({ ...s, status: s.n === 1 ? ('completed' as const) : ('locked' as const) })) };
    expect(currentStep(noActive)?.id).toBe('step-2');
    const allDone = { ...mockPath, steps: mockPath.steps.map((s) => ({ ...s, status: 'completed' as const })) };
    expect(currentStep(allDone)).toBeUndefined();
    expect(stepHref('path 1', 'step/2')).toBe('/steps/step%2F2?path=path%201');
  });
});
