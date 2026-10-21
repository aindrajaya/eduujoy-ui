import type { QueryClient } from '@tanstack/react-query';
import { submitCheckpoint, type CheckpointSubmission } from '@/api/endpoints/checkpoints';
import type { ApiError } from '@/api/errors';
import type { CheckpointAnswer, CheckpointItem } from '@/api/types';
import { pathKeys } from '@/features/paths/keys';
import type { Answer, QuizQuestion } from '@/features/quiz/types';
import { formatRetryWait } from '@/lib/time';

/** CheckpointItem kinds are a subset of the quiz engine's. */
export const toQuizQuestions = (items: readonly CheckpointItem[]): QuizQuestion[] => items.map((item) => ({ ...item }));

/** Every item is sent; an unanswered one goes as its id alone (the API scores it 0). */
export function toCheckpointAnswers(items: readonly CheckpointItem[], answers: Record<string, Answer>): CheckpointAnswer[] {
  return items.map((item) => {
    const answer = answers[item.id];
    return {
      itemId: item.id,
      ...(answer?.optionIds?.length ? { optionIds: answer.optionIds } : {}),
      ...(answer?.text ? { text: answer.text } : {}),
    };
  });
}

/** PRD-UI §7: all answers in one request; the attempt's key is reused on every retry. */
export const submitAnswers = (
  stepId: string,
  items: readonly CheckpointItem[],
  answers: Record<string, Answer>,
  idempotencyKey: string,
): Promise<CheckpointSubmission> =>
  submitCheckpoint(stepId, { answers: toCheckpointAnswers(items, answers) }, idempotencyKey);

/** A graded attempt changes the path: step status, attempts, last score, maybe a remedial step. */
export function onCheckpointGraded(client: QueryClient): void {
  void client.invalidateQueries({ queryKey: pathKeys.all });
}

/** Copy for a failed submit; undefined falls back to the quiz engine's generic copy. */
export function describeSubmitError(error: ApiError): string | undefined {
  switch (error.code) {
    case 'AI_BUDGET_EXCEEDED':
      return `Grading has reached today’s limit. Your answers are saved on this device; submit them again ${formatRetryWait(error.retryAfterMs)}.`;
    case 'CONFLICT':
      return 'These answers were already sent with a different attempt. Reload the page to start a new attempt.';
    case 'NOT_FOUND':
      return 'This checkpoint is no longer part of your path.';
    case 'FORBIDDEN':
      return 'This checkpoint is not open yet. Finish the steps before it first.';
    default:
      return undefined;
  }
}
