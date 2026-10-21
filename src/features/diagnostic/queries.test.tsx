import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockDiagnosticBatch, mockDiagnosticCompleted, mockDiagnosticResume, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import type { DiagnosticAnswersRequest } from '@/api/types';
import { createTestQueryClient, withQueryClient } from '@/test/providers';
import { diagnosticKeys } from './keys';
import { submitBatch, toDiagnosticAnswers, useDiagnostic } from './queries';

const items = mockDiagnosticBatch.items ?? [];

describe('diagnostic queries', () => {
  it('uses the seeded first batch without a request', () => {
    const client = createTestQueryClient();
    client.setQueryData(diagnosticKeys.batch('diag-1'), mockDiagnosticBatch);
    let calls = 0;
    server.use(
      http.get('/v1/diagnostics/{id}', ({ response }) => {
        calls += 1;
        return response(200).json(mockDiagnosticResume);
      }),
    );
    const { result } = renderHook(() => useDiagnostic('diag-1'), { wrapper: withQueryClient(client) });
    expect(result.current.data).toEqual(mockDiagnosticBatch);
    expect(calls).toBe(0);
  });

  it('resumes from GET /v1/diagnostics/{id} after a reload', async () => {
    const { result } = renderHook(() => useDiagnostic('diag-1'), { wrapper: withQueryClient(createTestQueryClient()) });
    await waitFor(() => {
      expect(result.current.data).toEqual(mockDiagnosticResume);
    });
  });

  it('maps answers and marks unanswered or skipped items as skipped', () => {
    expect(
      toDiagnosticAnswers(items, { q1: { optionIds: ['b'] }, q2: { skipped: true } }),
    ).toEqual([
      { itemId: 'q1', skipped: false, optionIds: ['b'] },
      { itemId: 'q2', skipped: true },
    ]);
    expect(toDiagnosticAnswers(items, { q2: { text: 'Visibility of status' } })).toEqual([
      { itemId: 'q1', skipped: true },
      { itemId: 'q2', skipped: false, text: 'Visibility of status' },
    ]);
  });

  it('submits a batch and returns the next state', async () => {
    let body: DiagnosticAnswersRequest | undefined;
    server.use(
      http.post('/v1/diagnostics/{id}/answers', async ({ request, response }) => {
        body = await request.json();
        return response(200).json(mockDiagnosticCompleted);
      }),
    );
    await expect(submitBatch('diag-1', items, { q1: { optionIds: ['a'] } })).resolves.toEqual(mockDiagnosticCompleted);
    expect(body?.answers).toHaveLength(2);
  });

  it('treats 409 as already recorded and fetches the current state', async () => {
    server.use(
      http.post('/v1/diagnostics/{id}/answers', ({ response }) =>
        response.untyped(problemResponse(mockProblem(409, 'CONFLICT', 'Batch already answered'))),
      ),
    );
    await expect(submitBatch('diag-1', items, {})).resolves.toEqual(mockDiagnosticResume);
  });

  it('passes other errors through', async () => {
    server.use(
      http.post('/v1/diagnostics/{id}/answers', ({ response }) =>
        response.untyped(problemResponse(mockProblem(403, 'FORBIDDEN', 'Not yours'))),
      ),
    );
    await expect(submitBatch('diag-1', items, {})).rejects.toMatchObject({ status: 403 });
  });
});
