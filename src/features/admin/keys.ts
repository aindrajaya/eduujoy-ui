import type { MetricsRange } from '@/api/endpoints/admin';

export type ReviewStatus = 'open' | 'resolved';

export const adminKeys = {
  all: ['admin'] as const,
  queue: (status: ReviewStatus) => [...adminKeys.all, 'queue', status] as const,
  cost: (range: MetricsRange) => [...adminKeys.all, 'cost', range] as const,
  latency: (range: MetricsRange) => [...adminKeys.all, 'latency', range] as const,
};
