import { api } from '../client';
import type {
  CostMetricsResponse,
  LatencyMetricsResponse,
  ReviewItem,
  ReviewQueueResponse,
  ReviewResolveRequest,
} from '../types';

export interface ReviewQueueParams {
  status?: 'open' | 'resolved';
  cursor?: string;
  limit?: number;
}

export interface MetricsRange {
  from?: string;
  to?: string;
}

export async function listReviewQueue(params: ReviewQueueParams = {}): Promise<ReviewQueueResponse> {
  const { data } = await api.get<ReviewQueueResponse>('/v1/admin/review-queue', { params });
  return data;
}

export async function resolveReviewItem(id: string, body: ReviewResolveRequest): Promise<ReviewItem> {
  const { data } = await api.patch<ReviewItem>(
    `/v1/admin/review-queue/${encodeURIComponent(id)}`,
    body,
  );
  return data;
}

export async function getCostMetrics(range: MetricsRange = {}): Promise<CostMetricsResponse> {
  const { data } = await api.get<CostMetricsResponse>('/v1/admin/metrics/cost', { params: range });
  return data;
}

export async function getLatencyMetrics(range: MetricsRange = {}): Promise<LatencyMetricsResponse> {
  const { data } = await api.get<LatencyMetricsResponse>('/v1/admin/metrics/latency', {
    params: range,
  });
  return data;
}
