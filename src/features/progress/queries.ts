import { queryOptions, useQuery } from '@tanstack/react-query';
import { getProgress, getProgressHistory } from '@/api/endpoints/progress';
import type { ApiError } from '@/api/errors';
import type { ProgressHistoryResponse, TopicPosition } from '@/api/types';
import { progressKeys } from './keys';

export const progressQuery = () =>
  queryOptions<TopicPosition[], ApiError>({
    queryKey: progressKeys.list(),
    queryFn: async () => (await getProgress()).items,
  });

export const progressHistoryQuery = (topicId: string) =>
  queryOptions<ProgressHistoryResponse['items'], ApiError>({
    queryKey: progressKeys.history(topicId),
    queryFn: async () => (await getProgressHistory(topicId)).items,
  });

/** US-09: the learner's position per topic. Realtime events invalidate `progressKeys.all`. */
export const useProgress = () => useQuery(progressQuery());

export const useProgressHistory = (topicId: string | undefined) =>
  useQuery({ ...progressHistoryQuery(topicId ?? ''), enabled: Boolean(topicId) });
