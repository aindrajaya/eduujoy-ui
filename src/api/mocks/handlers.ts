// Default MSW handlers for every contract operation the UI calls (the happy path).
// Paths, params, bodies and responses are type-checked against src/api/schema.d.ts via openapi-msw.
// Tests override individual handlers with server.use(...).
import { HttpResponse } from 'msw';
import { createOpenApiHttp } from 'openapi-msw';
import { env } from '@/lib/env';
import type { paths } from '../schema';
import type { Problem } from '../types';
import { after, sseResponse } from './sse';
import {
  mockCheckpointResult,
  mockCostMetrics,
  mockDiagnosticBatch,
  mockDiagnosticCompleted,
  mockDiagnosticResume,
  mockGradeJobAccepted,
  mockGradeJobEvents,
  mockJobAccepted,
  mockLatencyMetrics,
  mockMe,
  mockPathJobEvents,
  mockPathSummary,
  mockPath,
  mockProblem,
  mockResolveCreatedNoRelated,
  mockResolveCreatedWithRelated,
  mockProgress,
  mockProgressHistory,
  mockResolveMatched,
  mockReviewItems,
  mockReviewQueue,
} from './data';

export const http = createOpenApiHttp<paths>({ baseUrl: env.apiUrl });

/** A problem+json response with the right content type. */
export function problemResponse(problem: Problem, headers: Record<string, string> = {}) {
  return HttpResponse.json(problem, {
    status: problem.status,
    headers: { 'Content-Type': 'application/problem+json', ...headers },
  });
}

export const handlers = [
  http.get('/health', ({ response }) => response(200).json({ status: 'ok', version: 'mock' })),

  // Auth
  http.get('/v1/auth/me', ({ response }) => response(200).json(mockMe)),
  http.post('/v1/auth/login', ({ response }) => response(200).json(mockMe)),
  http.post('/v1/auth/register', ({ response }) => response(201).json(mockMe)),
  http.post('/v1/auth/logout', ({ response }) => response(204).empty()),
  http.post('/v1/auth/refresh', ({ response }) => response(204).empty()),

  // Catalog and assessment
  // Contract 0.4.0: the topic "embedding outage" simulates an outage with no name-fallback match.
  http.post('/v1/topics/resolve', async ({ request, response }) => {
    const { text } = await request.json();
    // Contract 0.9.0: topics with no item bank, with and without nearby banked topics.
    if (text.trim().toLowerCase() === 'creative coding') return response(200).json(mockResolveCreatedWithRelated);
    if (text.trim().toLowerCase() === 'underwater basket weaving') return response(200).json(mockResolveCreatedNoRelated);
    if (text.trim().toLowerCase() === 'embedding outage') {
      return response.untyped(
        problemResponse(mockProblem(503, 'SERVICE_UNAVAILABLE', 'Topic search is unavailable'), { 'Retry-After': '30' }),
      );
    }
    return response(200).json(mockResolveMatched);
  }),
  http.post('/v1/diagnostics', ({ response }) => response(201).json(mockDiagnosticBatch)),
  http.get('/v1/diagnostics/{id}', ({ params, response }) =>
    params.id === mockDiagnosticResume.diagnosticId
      ? response(200).json(mockDiagnosticResume)
      : response.untyped(problemResponse(mockProblem(404, 'NOT_FOUND', 'Diagnostic not found'))),
  ),
  http.post('/v1/diagnostics/{id}/answers', ({ response }) =>
    response(200).json(mockDiagnosticCompleted),
  ),

  // Paths and steps
  http.get('/v1/paths', ({ request, response }) => {
    const status = new URL(request.url).searchParams.get('status');
    const items = status ? [mockPathSummary].filter((p) => p.status === status) : [mockPathSummary];
    return response(200).json({ items, nextCursor: null });
  }),
  http.post('/v1/paths', ({ request, response }) =>
    request.headers.get('Idempotency-Key')
      ? response(202).json(mockJobAccepted)
      : response.untyped(
          problemResponse(mockProblem(400, 'VALIDATION_FAILED', 'Idempotency-Key is required')),
        ),
  ),
  http.get('/v1/paths/{id}', ({ params, response }) =>
    params.id === mockPath.id
      ? response(200).json(mockPath)
      : response.untyped(problemResponse(mockProblem(404, 'NOT_FOUND', 'Path not found'))),
  ),
  http.patch('/v1/steps/{id}', async ({ params, request, response }) => {
    const patch = await request.json();
    const found = mockPath.steps.find((s) => s.id === params.id);
    if (!found) return response.untyped(problemResponse(mockProblem(404, 'NOT_FOUND', 'Step not found')));
    return response(200).json({
      ...found,
      status: patch.status ?? found.status,
      difficulty: patch.difficulty ?? found.difficulty,
      actions: found.actions.map((a) => ({
        ...a,
        done: patch.actionsDone?.find((d) => d.n === a.n)?.done ?? a.done,
      })),
    });
  }),
  http.post('/v1/resources/{id}/swap', async ({ request, response }) => {
    const { stepId } = await request.json();
    const found = mockPath.steps.find((s) => s.id === stepId) ?? mockPath.steps[0];
    if (!found) return response.untyped(problemResponse(mockProblem(404, 'NOT_FOUND', 'Step not found')));
    return response(200).json(found);
  }),
  http.post('/v1/feedback', ({ response }) => response(204).empty()),

  // Checkpoints
  // Open answers need AI grading (202 + job); choice-only submissions are graded at once (200).
  http.post('/v1/checkpoints/{id}/submissions', async ({ request, response }) => {
    if (!request.headers.get('Idempotency-Key')) {
      return response.untyped(problemResponse(mockProblem(400, 'VALIDATION_FAILED', 'Idempotency-Key is required')));
    }
    const { answers } = await request.json();
    return answers.some((a) => a.text)
      ? response(202).json(mockGradeJobAccepted)
      : response(200).json(mockCheckpointResult);
  }),

  // Progress and billing
  // Jobs: path generation progress over SSE; replays events after Last-Event-ID.
  http.get('/v1/jobs/{id}/events', ({ params, request, response }) => {
    const events = params.id === mockGradeJobAccepted.jobId ? mockGradeJobEvents : mockPathJobEvents;
    return response.untyped(sseResponse(after(events, request.headers.get('Last-Event-ID'))));
  }),

  http.get('/v1/progress', ({ response }) => response(200).json(mockProgress)),
  http.get('/v1/progress/{topicId}/history', ({ response }) =>
    response(200).json(mockProgressHistory),
  ),
  // Account (contract 0.6.0): the export is a JSON attachment; delete answers 204 and clears cookies.
  http.get('/v1/me/export', ({ response }) =>
    response(200).json(
      { user: mockMe.user, exportedAt: '2026-10-22T08:00:00Z' },
      { headers: { 'Content-Disposition': 'attachment; filename="eduujoy-export.json"' } },
    ),
  ),
  http.delete('/v1/me', ({ response }) => response(204).empty()),
  http.post('/v1/billing/checkout', ({ response }) =>
    response(200).json({ url: 'https://eduujoy.lemonsqueezy.com/checkout/mock' }),
  ),

  // Admin
  http.get('/v1/admin/review-queue', ({ request, response }) => {
    const status = new URL(request.url).searchParams.get('status') ?? 'open';
    const items = mockReviewItems.filter((i) => i.status === status);
    return response(200).json({ ...mockReviewQueue, items });
  }),
  http.patch('/v1/admin/review-queue/{id}', async ({ params, request, response }) => {
    const { resolution } = await request.json();
    const item = mockReviewItems.find((i) => i.id === params.id);
    if (!item) return response.untyped(problemResponse(mockProblem(404, 'NOT_FOUND', 'Item not found')));
    return response(200).json({ ...item, status: 'resolved', resolution });
  }),
  http.get('/v1/admin/metrics/cost', ({ response }) => response(200).json(mockCostMetrics)),
  http.get('/v1/admin/metrics/latency', ({ response }) => response(200).json(mockLatencyMetrics)),
];
