import type { ApiError } from '@/api/errors';

/** One-line, user-facing copy for a failed load. */
export function errorCopy(error: ApiError): string {
  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
    return 'We could not reach the server. Check your connection and try again.';
  }
  if (error.status === 404) return 'This item no longer exists.';
  if (error.status === 403) return 'You do not have access to this.';
  return 'Something went wrong while loading. Please try again.';
}
