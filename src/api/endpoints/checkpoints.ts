import { api } from '../client';
import type { CheckpointResult, CheckpointSubmissionRequest, JobAccepted } from '../types';

/** 200 when graded synchronously; 202 with a job when open answers need AI grading (SSE). */
export type CheckpointSubmission =
  | { kind: 'graded'; result: CheckpointResult }
  | { kind: 'grading'; job: JobAccepted };

export async function submitCheckpoint(
  stepId: string,
  body: CheckpointSubmissionRequest,
  idempotencyKey: string,
): Promise<CheckpointSubmission> {
  const res = await api.post<CheckpointResult | JobAccepted>(
    `/v1/checkpoints/${encodeURIComponent(stepId)}/submissions`,
    body,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return res.status === 202
    ? { kind: 'grading', job: res.data as JobAccepted }
    : { kind: 'graded', result: res.data as CheckpointResult };
}
