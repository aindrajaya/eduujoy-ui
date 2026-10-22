import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import {
  getCostMetrics,
  getLatencyMetrics,
  listReviewQueue,
  resolveReviewItem,
  type MetricsRange,
} from '@/api/endpoints/admin';
import type { ApiError } from '@/api/errors';
import type {
  CostMetricsResponse,
  LatencyMetricsResponse,
  ReviewItem,
  ReviewQueueResponse,
  ReviewResolveRequest,
} from '@/api/types';
import { toast } from '@/ui/toast/store';
import { adminKeys, type ReviewStatus } from './keys';

const PAGE_SIZE = 20;

/** FR-24: the review queue, a page at a time (cursor). */
export function useReviewQueue(status: ReviewStatus) {
  return useInfiniteQuery<ReviewQueueResponse, ApiError, InfiniteData<ReviewQueueResponse>, ReturnType<typeof adminKeys.queue>, string | undefined>({
    queryKey: adminKeys.queue(status),
    queryFn: ({ pageParam }) => listReviewQueue({ status, limit: PAGE_SIZE, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

interface ResolveVars extends ReviewResolveRequest {
  id: string;
}

type QueueData = InfiniteData<ReviewQueueResponse> | undefined;

/** Resolving takes the item off the open list at once; it comes back with a toast on error. */
export function useResolveReview() {
  const client = useQueryClient();
  const openKey = adminKeys.queue('open');
  return useMutation<ReviewItem, ApiError, ResolveVars, { previous: QueueData }>({
    mutationFn: ({ id, ...body }) => resolveReviewItem(id, body),
    onMutate: async ({ id }) => {
      await client.cancelQueries({ queryKey: openKey });
      const previous = client.getQueryData<InfiniteData<ReviewQueueResponse>>(openKey);
      client.setQueryData<InfiniteData<ReviewQueueResponse>>(openKey, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => {
                const items = page.items.filter((item) => item.id !== id);
                return { ...page, items, openCount: Math.max(0, page.openCount - (page.items.length - items.length)) };
              }),
            }
          : data,
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(openKey, context.previous);
      toast({ title: 'Could not resolve that item', tone: 'error' });
    },
    onSuccess: (item) => {
      toast({ title: item.resolution === 'approved' ? 'Approved' : 'Rejected', tone: 'success' });
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

/** FR-25: AI cost and latency per pipeline stage and model, for a date range. */
export const useCostMetrics = (range: MetricsRange) =>
  useQuery<CostMetricsResponse, ApiError>({ queryKey: adminKeys.cost(range), queryFn: () => getCostMetrics(range) });

export const useLatencyMetrics = (range: MetricsRange) =>
  useQuery<LatencyMetricsResponse, ApiError>({ queryKey: adminKeys.latency(range), queryFn: () => getLatencyMetrics(range) });

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** The last 7 days, ending today (UTC, as the API counts days). */
export function defaultRange(now: Date = new Date()): Required<MetricsRange> {
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - 6);
  return { from: isoDay(from), to: isoDay(now) };
}
