import { getDiagnostic, submitDiagnosticAnswers } from '@/api/endpoints/diagnostics';
import type { DiagnosticAnswer, DiagnosticBatchResponse, Topic } from '@/api/types';
import type { Answer } from '@/features/quiz/types';
import type { DiagnosticPort } from './port';

/** The cached diagnostic: a batch, plus the topic when it came from GET /v1/diagnostics/{id}. */
export type DiagnosticState = DiagnosticBatchResponse & { topic?: Topic };

/** Every item in the batch is sent; unanswered ones count as skipped (DiagnosticAnswer.skipped). */
export function toDiagnosticAnswers(
  items: readonly { id: string }[],
  answers: Record<string, Answer>,
): DiagnosticAnswer[] {
  return items.map((item) => {
    const answer = answers[item.id];
    if (!answer || answer.skipped) return { itemId: item.id, skipped: true };
    return {
      itemId: item.id,
      skipped: false,
      ...(answer.optionIds ? { optionIds: answer.optionIds } : {}),
      ...(answer.text ? { text: answer.text } : {}),
    };
  });
}

/**
 * U6 against the API (contracts 0.2.0 and 0.3.0): GET /v1/diagnostics/{id} resumes, and
 * POST /v1/diagnostics/{id}/answers sends a batch; the same Idempotency-Key replays the stored 200.
 */
export const apiDiagnosticAdapter: DiagnosticPort<DiagnosticState, DiagnosticBatchResponse> = {
  load: getDiagnostic,
  submitAnswers: (id, items, answers, idempotencyKey) =>
    submitDiagnosticAnswers(id, { answers: toDiagnosticAnswers(items, answers) }, idempotencyKey),
};
