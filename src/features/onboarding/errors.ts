import type { ApiError } from '@/api/errors';

/** Form-level copy for intake failures; field errors are shown on their fields. */
export function intakeErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'VALIDATION_FAILED':
      return 'Check the highlighted fields.';
    case 'RATE_LIMITED': {
      const seconds = error.retryAfterMs ? Math.ceil(error.retryAfterMs / 1000) : undefined;
      return seconds ? `Too many requests. Try again in ${seconds} seconds.` : 'Too many requests. Try again shortly.';
    }
    case 'NOT_FOUND':
      return 'That topic is no longer available. Pick another or rephrase.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
