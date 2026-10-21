import { api } from '../client';
import type {
  DiagnosticAnswersRequest,
  DiagnosticBatchResponse,
  DiagnosticResponse,
  DiagnosticStartRequest,
} from '../types';

export async function startDiagnostic(body: DiagnosticStartRequest): Promise<DiagnosticBatchResponse> {
  const { data } = await api.post<DiagnosticBatchResponse>('/v1/diagnostics', body);
  return data;
}

/** Contract 0.3.0: the same Idempotency-Key and body replays the stored 200 on a retry. */
export async function submitDiagnosticAnswers(
  id: string,
  body: DiagnosticAnswersRequest,
  idempotencyKey?: string,
): Promise<DiagnosticBatchResponse> {
  const { data } = await api.post<DiagnosticBatchResponse>(
    `/v1/diagnostics/${encodeURIComponent(id)}/answers`,
    body,
    idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
  );
  return data;
}

/** Contract 0.2.0: the outstanding batch (or the placement) so a reload resumes where it stopped. */
export async function getDiagnostic(id: string): Promise<DiagnosticResponse> {
  const { data } = await api.get<DiagnosticResponse>(`/v1/diagnostics/${encodeURIComponent(id)}`);
  return data;
}
