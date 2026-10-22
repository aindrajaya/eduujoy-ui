import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startDiagnostic } from '@/api/endpoints/diagnostics';
import { resolveTopic } from '@/api/endpoints/topics';
import type { ApiError } from '@/api/errors';
import type {
  DiagnosticBatchResponse,
  DiagnosticStartRequest,
  TopicResolveRequest,
  TopicResolveResponse,
} from '@/api/types';
import { diagnosticKeys } from '@/features/diagnostic/keys';

/** US-01: free text → canonical topic (`matched`/`created`) or up to three `choices`. */
export function useResolveTopic() {
  return useMutation<TopicResolveResponse, ApiError, TopicResolveRequest>({ mutationFn: resolveTopic });
}

/** Starts the diagnostic for the chosen topic and seeds its first batch for the diagnostic screen. */
export function useStartDiagnostic() {
  const client = useQueryClient();
  return useMutation<DiagnosticBatchResponse, ApiError, DiagnosticStartRequest>({
    mutationFn: startDiagnostic,
    onSuccess: (batch) => {
      client.setQueryData(diagnosticKeys.batch(batch.diagnosticId), batch);
    },
  });
}
