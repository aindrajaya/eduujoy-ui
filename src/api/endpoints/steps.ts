import { api } from '../client';
import type { FeedbackRequest, PathStep, ResourceSwapRequest, StepPatchRequest } from '../types';

export async function updateStep(id: string, body: StepPatchRequest): Promise<PathStep> {
  const { data } = await api.patch<PathStep>(`/v1/steps/${encodeURIComponent(id)}`, body);
  return data;
}

export async function swapResource(resourceId: string, body: ResourceSwapRequest): Promise<PathStep> {
  const { data } = await api.post<PathStep>(
    `/v1/resources/${encodeURIComponent(resourceId)}/swap`,
    body,
  );
  return data;
}

export async function sendFeedback(body: FeedbackRequest): Promise<void> {
  await api.post('/v1/feedback', body);
}
