import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockJobAccepted } from '@/api/mocks/data';
import { http } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { createTestQueryClient, withQueryClient } from '@/test/providers';
import { useCreatePath } from './queries';

describe('useCreatePath', () => {
  it('reuses one Idempotency-Key across attempts from the same screen', async () => {
    const keys: (string | null)[] = [];
    server.use(
      http.post('/v1/paths', ({ request, response }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return response(202).json(mockJobAccepted);
      }),
    );
    const { result } = renderHook(() => useCreatePath(), { wrapper: withQueryClient(createTestQueryClient()) });
    for (let i = 0; i < 2; i += 1) {
      act(() => {
        result.current.mutate({ placementId: 'placement-1' });
      });
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      act(() => {
        result.current.reset();
      });
    }
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[1]).toBe(keys[0]);
  });
});
