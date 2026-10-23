import type { ApiError } from '@/api/errors';

/**
 * Until the API's progress endpoints ship (A11), GET /v1/progress answers 404 NOT_FOUND. That is
 * not a failure the learner can retry, so /progress says what will happen instead, as the path
 * screens do until A9 (isPathBuildingClosed). Remove with the A9/A11 shims once A11 is deployed.
 */
export const isProgressClosed = (error: ApiError | null): boolean =>
  error?.status === 404 && error.code === 'NOT_FOUND';
