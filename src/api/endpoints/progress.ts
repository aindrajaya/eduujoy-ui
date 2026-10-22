import { api } from '../client';
import type { ProgressHistoryResponse, ProgressResponse } from '../types';

export async function getProgress(): Promise<ProgressResponse> {
  const { data } = await api.get<ProgressResponse>('/v1/progress');
  return data;
}

export async function getProgressHistory(topicId: string): Promise<ProgressHistoryResponse> {
  const { data } = await api.get<ProgressHistoryResponse>(
    `/v1/progress/${encodeURIComponent(topicId)}/history`,
  );
  return data;
}
