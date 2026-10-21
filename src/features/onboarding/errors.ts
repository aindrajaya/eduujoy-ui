import type { ApiError } from '@/api/errors';

/** The intake call that failed: topic search, or starting the diagnostic. */
export type IntakeStep = 'resolve' | 'start';

/** Form-level copy for intake failures; field errors are shown on their fields. */
export function intakeErrorMessage(error: ApiError, step: IntakeStep = 'start'): string {
  // Contract 0.4.0: 503 from topic resolve during an embedding outage (Retry-After 30). User-decided wording.
  if (step === 'resolve' && error.code === 'SERVICE_UNAVAILABLE') return 'Topic search is briefly unavailable, try again';
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
