import { api } from '../client';
import type { operations } from '../schema';
import type { JobAccepted, Path, PathCreateRequest, PathListResponse } from '../types';

export type PathStatus = NonNullable<NonNullable<operations['pathsList']['parameters']['query']>['status']>;

export interface ListPathsParams {
  /** Contract 0.1.0: e.g. 'active' for the Today screen. Served from A9. */
  status?: PathStatus;
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
