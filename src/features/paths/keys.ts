import type { ListPathsParams } from '@/api/endpoints/paths';

/** PRD-UI §5 key factory: Today and step screens share pathKeys.detail(id), so one request serves both. */
export const pathKeys = {
  all: ['paths'] as const,
  list: (params: ListPathsParams = {}) => [...pathKeys.all, 'list', params] as const,
  detail: (id: string) => [...pathKeys.all, 'detail', id] as const,
};
