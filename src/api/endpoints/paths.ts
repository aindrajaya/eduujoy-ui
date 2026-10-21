import { api } from '../client';
import type { JobAccepted, Path, PathCreateRequest, PathListResponse } from '../types';

export interface ListPathsParams {
  topicId?: string;
  cursor?: string;
  limit?: number;
}

// ETags: the browser's HTTP cache revalidates GETs itself, so no manual If-None-Match here.
export async function listPaths(params: ListPathsParams = {}): Promise<PathListResponse> {
  const { data } = await api.get<PathListResponse>('/v1/paths', { params });
  return data;
}

export async function getPath(id: string): Promise<Path> {
  const { data } = await api.get<Path>(`/v1/paths/${encodeURIComponent(id)}`);
  return data;
}

/** Starts path generation. Reuse the same `idempotencyKey` when retrying one user action. */
export async function createPath(body: PathCreateRequest, idempotencyKey: string): Promise<JobAccepted> {
  const { data } = await api.post<JobAccepted>('/v1/paths', body, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return data;
}
