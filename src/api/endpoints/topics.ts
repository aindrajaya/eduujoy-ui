import { api } from '../client';
import type { TopicResolveRequest, TopicResolveResponse } from '../types';

export async function resolveTopic(body: TopicResolveRequest): Promise<TopicResolveResponse> {
  const { data } = await api.post<TopicResolveResponse>('/v1/topics/resolve', body);
  return data;
}
