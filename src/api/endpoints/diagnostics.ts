import { api } from '../client';
import type {
  DiagnosticAnswersRequest,
  DiagnosticBatchResponse,
  DiagnosticStartRequest,
} from '../types';

export async function startDiagnostic(body: DiagnosticStartRequest): Promise<DiagnosticBatchResponse> {
  const { data } = await api.post<DiagnosticBatchResponse>('/v1/diagnostics', body);
  return data;
}

export async function submitDiagnosticAnswers(
  id: string,
  body: DiagnosticAnswersRequest,
): Promise<DiagnosticBatchResponse> {
  const { data } = await api.post<DiagnosticBatchResponse>(
    `/v1/diagnostics/${encodeURIComponent(id)}/answers`,
    body,
  );
  return data;
}
