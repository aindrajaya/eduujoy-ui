import type { ApiError } from '@/api/errors';

/**
 * Until path building ships on the API (A9), GET /v1/paths answers 404 NOT_FOUND. That is not a
 * failure the learner can retry, so the path screens say what will happen instead. Kept out of
 * pathQueries.ts, which is in /signin's initial JS (budget).
 */
export const isPathBuildingClosed = (error: ApiError | null): boolean =>
  error?.status === 404 && error.code === 'NOT_FOUND';
