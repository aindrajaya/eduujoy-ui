import { type QueryClient, queryOptions, useQuery } from '@tanstack/react-query';
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
export const useActivePaths = (enabled = true) => useQuery({ ...activePathsQuery(), enabled });
export const usePath = (id: string | undefined) => useQuery({ ...pathQuery(id ?? ''), enabled: Boolean(id) });

/**
 * The path a step-level screen belongs to: `?path=` in the URL, else (old links) the active path.
 * `noPath` is true once the list has loaded without an active path.
 */
export function useRoutedPath(fromUrl: string | null) {
  const active = useActivePaths(!fromUrl);
  const pathId = fromUrl ?? active.data?.[0]?.id;
  const path = usePath(pathId);
  return {
    path,
    // A disabled query counts as pending; only wait for the list when it is the source.
    isPending: path.isPending || (!fromUrl && active.isPending),
    noPath: !fromUrl && active.isSuccess && !pathId,
  };
}

export const findStep = (path: Path | undefined, stepId: string): PathStep | undefined =>
  path?.steps.find((s) => s.id === stepId);

/** The step to work on now: the active one, else the first not yet completed or skipped. */
export const currentStep = (path: Path): PathStep | undefined =>
  path.steps.find((s) => s.status === 'active') ??
  path.steps.find((s) => s.status !== 'completed' && s.status !== 'skipped');

/**
 * A job's `resultRef` names the result as an API path (contract example `/v1/paths/path_19c2`).
 * A bare id is accepted too. Anything else gives undefined, so the caller falls back to Today.
 */
export function pathIdFromRef(ref: string | undefined): string | undefined {
  if (!ref) return undefined;
  const match = /^\/v1\/paths\/([^/?#]+)$/.exec(ref);
  if (match) return decodeURIComponent(match[1] ?? '');
  return /^[^/?#]+$/.test(ref) ? ref : undefined;
}

/** Link to a step's checkpoint (the contract keys checkpoints by step id). */
export const checkpointHref = (pathId: string, stepId: string) =>
  `/checkpoints/${encodeURIComponent(stepId)}?path=${encodeURIComponent(pathId)}`;

/** Link to a step; the path id travels in the URL so a reload can load the path (no GET /v1/steps). */
export const stepHref = (pathId: string, stepId: string) =>
  `/steps/${encodeURIComponent(stepId)}?path=${encodeURIComponent(pathId)}`;

/**
 * Today's data, started from the route loader so the list request does not wait for the page
 * chunk. The detail is only needed when the list has no currentStep (before contract 0.3.0).
 */
export async function prefetchActivePath(client: QueryClient): Promise<void> {
  const [summary] = await client.query(activePathsQuery());
  if (summary && summary.currentStep === undefined) await client.query(pathQuery(summary.id));
}
