import { queryOptions, useQuery } from '@tanstack/react-query';
import { getPath, listPaths } from '@/api/endpoints/paths';
import type { ApiError } from '@/api/errors';
import type { Path, PathStep, PathSummary } from '@/api/types';
import { pathKeys } from './keys';

export const pathsQuery = () =>
  queryOptions<PathSummary[], ApiError>({
    queryKey: pathKeys.list(),
    queryFn: async () => (await listPaths()).items,
    refetchOnWindowFocus: true,
  });

/**
 * PRD-UI §3: Today reads GET /v1/paths?status=active (contract 0.1.0). Until A9 serves the filter,
 * the client filters too, so an API that ignores it still yields only active paths.
 */
export const activePathsQuery = () =>
  queryOptions<PathSummary[], ApiError>({
    queryKey: pathKeys.list({ status: 'active' }),
    queryFn: async () => (await listPaths({ status: 'active' })).items.filter((p) => p.status === 'active'),
    refetchOnWindowFocus: true,
  });

/** Path detail is kept 30 min so step pages reuse it (PRD-UI §5). */
export const pathQuery = (id: string) =>
  queryOptions<Path, ApiError>({
    queryKey: pathKeys.detail(id),
    queryFn: () => getPath(id),
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: true,
  });

export const usePaths = () => useQuery(pathsQuery());
export const useActivePaths = () => useQuery(activePathsQuery());
export const usePath = (id: string | undefined) => useQuery({ ...pathQuery(id ?? ''), enabled: Boolean(id) });

export const findStep = (path: Path | undefined, stepId: string): PathStep | undefined =>
  path?.steps.find((s) => s.id === stepId);

/** The step to work on now: the active one, else the first not yet completed or skipped. */
export const currentStep = (path: Path): PathStep | undefined =>
  path.steps.find((s) => s.status === 'active') ??
  path.steps.find((s) => s.status !== 'completed' && s.status !== 'skipped');

/** Link to a step; the path id travels in the URL so a reload can load the path (no GET /v1/steps). */
export const stepHref = (pathId: string, stepId: string) =>
  `/steps/${encodeURIComponent(stepId)}?path=${encodeURIComponent(pathId)}`;
