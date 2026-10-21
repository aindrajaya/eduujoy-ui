import type { ApiError } from '@/api/errors';

/** Human copy for auth failures; field-level problems are shown on the fields instead. */
export function authErrorMessage(error: ApiError, mode: 'signin' | 'signup'): string {
  switch (error.code) {
    case 'UNAUTHENTICATED':
      return mode === 'signin' ? 'Email or password is incorrect.' : 'Could not create your account.';
    case 'EMAIL_TAKEN':
      return 'An account with this email already exists. Sign in instead.';
    case 'RATE_LIMITED': {
      const seconds = error.retryAfterMs === undefined ? undefined : Math.ceil(error.retryAfterMs / 1000);
      return seconds ? `Too many attempts. Try again in ${seconds} seconds.` : 'Too many attempts. Try again shortly.';
    }
    case 'VALIDATION_FAILED':
      return 'Check the highlighted fields.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
