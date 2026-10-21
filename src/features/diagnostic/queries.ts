import { queryOptions, useQuery } from '@tanstack/react-query';
import { getDiagnostic, submitDiagnosticAnswers } from '@/api/endpoints/diagnostics';
import { toApiError, type ApiError } from '@/api/errors';
import type { DiagnosticAnswer, DiagnosticBatchResponse, DiagnosticItem, Topic } from '@/api/types';
import type { Answer } from '@/features/quiz/types';
import { diagnosticKeys } from './keys';

/** The cached diagnostic: a batch, plus the topic when it came from GET /v1/diagnostics/{id}. */
export type DiagnosticState = DiagnosticBatchResponse & { topic?: Topic };

/**
 * The diagnostic's current batch. Onboarding seeds this key with the first batch, so the hand-off
 * makes no request; after a reload GET /v1/diagnostics/{id} resumes it (contract 0.2.0).
 */
export const diagnosticQuery = (id: string) =>
  queryOptions<DiagnosticState, ApiError>({
    queryKey: diagnosticKeys.batch(id),
    queryFn: () => getDiagnostic(id),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export function useDiagnostic(id: string) {
  return useQuery(diagnosticQuery(id));
}

/** Every item in the batch is sent; unanswered ones count as skipped (DiagnosticAnswer.skipped). */
export function toDiagnosticAnswers(
  items: readonly DiagnosticItem[],
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
 * Submits one batch. The contract has no Idempotency-Key here, so a retried batch can be
 * rejected with 409 once the first copy landed; then the current state is fetched instead.
 */
export async function submitBatch(
  id: string,
  items: readonly DiagnosticItem[],
  answers: Record<string, Answer>,
): Promise<DiagnosticBatchResponse> {
  try {
    return await submitDiagnosticAnswers(id, { answers: toDiagnosticAnswers(items, answers) });
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 409) return getDiagnostic(id);
    throw apiError;
  }
}
