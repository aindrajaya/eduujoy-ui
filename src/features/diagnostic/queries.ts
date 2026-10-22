import { queryOptions, useQuery } from '@tanstack/react-query';
import type { ApiError } from '@/api/errors';
import { apiDiagnosticAdapter, type DiagnosticState } from './apiAdapter';
import { diagnosticKeys } from './keys';

export { toDiagnosticAnswers, type DiagnosticState } from './apiAdapter';

/**
 * The diagnostic's current batch. Onboarding seeds this key with the first batch, so the hand-off
 * makes no request; after a reload GET /v1/diagnostics/{id} resumes it (contract 0.2.0).
 */
export const diagnosticQuery = (id: string) =>
  queryOptions<DiagnosticState, ApiError>({
    queryKey: diagnosticKeys.batch(id),
    queryFn: () => apiDiagnosticAdapter.load(id),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export function useDiagnostic(id: string) {
  return useQuery(diagnosticQuery(id));
}

/** Submits one batch with its key (PRD-UI §7); a retry reuses the key, so the API replays it. */
export const submitBatch = apiDiagnosticAdapter.submitAnswers;
