import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/errors';
import { mockCheckpointResult, mockGradeJobAccepted, mockPath } from '@/api/mocks/data';
import { http } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import type { CheckpointSubmissionRequest } from '@/api/types';
import { describeSubmitError, submitAnswers, toCheckpointAnswers, toQuizQuestions } from './queries';

const items = mockPath.steps[1]?.checkpoint.items ?? [];

describe('checkpoint answers', () => {
  it('maps every item, with only the fields that were answered', () => {
    expect(
      toCheckpointAnswers(items, {
        'cp-2-1': { optionIds: ['b'] },
        'cp-2-3': { text: 'Interviews, because they explain why.' },
      }),
    ).toEqual([
      { itemId: 'cp-2-1', optionIds: ['b'] },
      { itemId: 'cp-2-2' },
      { itemId: 'cp-2-3', text: 'Interviews, because they explain why.' },
    ]);
    expect(toQuizQuestions(items).map((q) => q.kind)).toEqual(['single_choice', 'multi_choice', 'open']);
  });

  it('sends all answers with the attempt key and tells graded from grading apart', async () => {
    let body: CheckpointSubmissionRequest | undefined;
    let key: string | null = null;
    server.use(
      http.post('/v1/checkpoints/{id}/submissions', async ({ request, response }) => {
        body = await request.json();
        key = request.headers.get('Idempotency-Key');
        return response(200).json(mockCheckpointResult);
      }),
    );
    await expect(submitAnswers('step-2', items, { 'cp-2-1': { optionIds: ['b'] } }, 'attempt-key-1')).resolves.toEqual({
      kind: 'graded',
      result: mockCheckpointResult,
    });
    expect(key).toBe('attempt-key-1');
    expect(body?.answers).toHaveLength(3);

    server.resetHandlers();
    await expect(submitAnswers('step-2', items, { 'cp-2-3': { text: 'Interviews' } }, 'attempt-key-2')).resolves.toEqual({
      kind: 'grading',
      job: mockGradeJobAccepted,
    });
  });

  it('describes the submit errors a checkpoint can hit, and leaves the rest generic', () => {
    const err = (status: number, code: ConstructorParameters<typeof ApiError>[0]['code']) => new ApiError({ status, code, title: 'x' });
    expect(describeSubmitError(err(503, 'AI_BUDGET_EXCEEDED'))).toMatch(/Grading is paused/);
    expect(describeSubmitError(err(409, 'CONFLICT'))).toMatch(/already sent/);
    expect(describeSubmitError(err(404, 'NOT_FOUND'))).toMatch(/no longer part/);
    expect(describeSubmitError(err(403, 'FORBIDDEN'))).toMatch(/not open yet/);
    expect(describeSubmitError(err(500, 'INTERNAL'))).toBeUndefined();
  });
});
