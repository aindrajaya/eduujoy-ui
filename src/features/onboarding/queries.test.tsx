import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockDiagnosticBatch, mockProblem, mockResolveMatched } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import type { DiagnosticStartRequest } from '@/api/types';
import { diagnosticKeys } from '@/features/diagnostic/keys';
import { createTestQueryClient, withQueryClient } from '@/test/providers';
import { useResolveTopic, useStartDiagnostic } from './queries';

describe('onboarding mutations', () => {
  it('resolves a topic', async () => {
    const { result } = renderHook(() => useResolveTopic(), { wrapper: withQueryClient(createTestQueryClient()) });
    act(() => {
      result.current.mutate({ text: 'ux design' });
    });
    await waitFor(() => {
      expect(result.current.data).toEqual(mockResolveMatched);
    });
  });

  it('surfaces resolve validation errors on the text field', async () => {
    server.use(
      http.post('/v1/topics/resolve', ({ response }) =>
        response.untyped(
          problemResponse(
            mockProblem(400, 'VALIDATION_FAILED', 'Invalid', { errors: [{ field: 'text', message: 'Too vague' }] }),
          ),
        ),
      ),
    );
    const { result } = renderHook(() => useResolveTopic(), { wrapper: withQueryClient(createTestQueryClient()) });
    act(() => {
      result.current.mutate({ text: 'it' });
    });
    await waitFor(() => {
      expect(result.current.error?.fieldErrors).toEqual({ text: 'Too vague' });
    });
  });

  it('starts the diagnostic with the intake and seeds the first batch', async () => {
    let body: DiagnosticStartRequest | undefined;
    server.use(
      http.post('/v1/diagnostics', async ({ request, response }) => {
        body = await request.json();
        return response(201).json(mockDiagnosticBatch);
      }),
    );
    const client = createTestQueryClient();
    const { result } = renderHook(() => useStartDiagnostic(), { wrapper: withQueryClient(client) });
    const input: DiagnosticStartRequest = {
      topicId: 'topic-ux',
      goal: 'Lead research',
      weeklyHours: 4,
      preferredFormats: ['video'],
    };
    act(() => {
      result.current.mutate(input);
    });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(body).toEqual(input);
    expect(client.getQueryData(diagnosticKeys.batch('diag-1'))).toEqual(mockDiagnosticBatch);
  });
});
