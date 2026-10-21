// Default MSW handlers for every contract operation the UI calls (the happy path).
// Paths, params, bodies and responses are type-checked against src/api/schema.d.ts via openapi-msw.
// Tests override individual handlers with server.use(...).
import { HttpResponse } from 'msw';
import { createOpenApiHttp } from 'openapi-msw';
import { env } from '@/lib/env';
import type { paths } from '../schema';
import type { Problem } from '../types';
import {
  mockCheckpointResult,
  mockCostMetrics,
  mockDiagnosticBatch,
  mockDiagnosticCompleted,
  mockJobAccepted,
  mockLatencyMetrics,
  mockMe,
  mockPath,
  mockProblem,
  mockProgress,
  mockProgressHistory,
  mockResolveMatched,
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
  http.post('/v1/topics/resolve', ({ response }) => response(200).json(mockResolveMatched)),
  http.post('/v1/diagnostics', ({ response }) => response(201).json(mockDiagnosticBatch)),
  http.post('/v1/diagnostics/{id}/answers', ({ response }) =>
    response(200).json(mockDiagnosticCompleted),
  ),

  // Paths and steps
  http.get('/v1/paths', ({ response }) =>
    response(200).json({ items: [mockPath], nextCursor: null }),
  ),
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
  http.post('/v1/checkpoints/{id}/submissions', ({ request, response }) =>
    request.headers.get('Idempotency-Key')
      ? response(200).json(mockCheckpointResult)
      : response.untyped(
          problemResponse(mockProblem(400, 'VALIDATION_FAILED', 'Idempotency-Key is required')),
        ),
  ),

  // Progress and billing
  http.get('/v1/progress', ({ response }) => response(200).json(mockProgress)),
  http.get('/v1/progress/{topicId}/history', ({ response }) =>
    response(200).json(mockProgressHistory),
  ),
  http.post('/v1/billing/checkout', ({ response }) =>
    response(200).json({ url: 'https://eduujoy.lemonsqueezy.com/checkout/mock' }),
  ),

  // Admin
  http.get('/v1/admin/review-queue', ({ response }) => response(200).json(mockReviewQueue)),
  http.patch('/v1/admin/review-queue/{id}', async ({ params, request, response }) => {
    const { resolution } = await request.json();
    const item = mockReviewQueue.items.find((i) => i.id === params.id);
    if (!item) return response.untyped(problemResponse(mockProblem(404, 'NOT_FOUND', 'Item not found')));
    return response(200).json({ ...item, status: 'resolved', resolution });
  }),
  http.get('/v1/admin/metrics/cost', ({ response }) => response(200).json(mockCostMetrics)),
  http.get('/v1/admin/metrics/latency', ({ response }) => response(200).json(mockLatencyMetrics)),
];
