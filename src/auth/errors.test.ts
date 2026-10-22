import { describe, expect, it } from 'vitest';
import { ApiError, type ApiErrorCode } from '@/api/errors';
import { authErrorMessage } from './errors';

const e = (code: ApiErrorCode, retryAfterMs?: number) => new ApiError({ status: 400, code, title: 't', retryAfterMs });

describe('authErrorMessage', () => {
  it.each([
    ['UNAUTHENTICATED', 'signin', 'Email or password is incorrect.'],
    ['UNAUTHENTICATED', 'signup', 'Could not create your account.'],
    ['EMAIL_TAKEN', 'signup', 'An account with this email already exists. Sign in instead.'],
    ['VALIDATION_FAILED', 'signup', 'Check the highlighted fields.'],
    ['NETWORK_ERROR', 'signin', 'Could not reach the server. Check your connection and try again.'],
    ['TIMEOUT', 'signin', 'Could not reach the server. Check your connection and try again.'],
    ['INTERNAL', 'signin', 'Something went wrong. Please try again.'],
  ] as const)('%s (%s)', (code, mode, text) => {
    expect(authErrorMessage(e(code), mode)).toBe(text);
  });

  it('rounds Retry-After up to whole seconds', () => {
    expect(authErrorMessage(e('RATE_LIMITED', 1200), 'signin')).toBe('Too many attempts. Try again in 2 seconds.');
    expect(authErrorMessage(e('RATE_LIMITED'), 'signin')).toBe('Too many attempts. Try again shortly.');
    expect(authErrorMessage(e('RATE_LIMITED', 0), 'signin')).toBe('Too many attempts. Try again shortly.');
  });
});
