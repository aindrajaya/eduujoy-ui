import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '@/api/endpoints/auth';
import type { ApiError } from '@/api/errors';
import { sessionKeys } from './session';

// Sign-out lives apart from sign-in (queries.ts): it is the only auth hook that needs TanStack's
// useMutation (for its retry policy), and /signin's initial JS should not carry that.

/** Logout is idempotent, so network and 5xx failures are retried twice (0.5 s, then 1 s). */
export function shouldRetrySignOut(failureCount: number, error: ApiError): boolean {
  return failureCount < 2 && (error.status === 0 || error.status >= 500);
}

export const signOutRetryDelay = (attempt: number) => 500 * 2 ** attempt;

/**
 * PRD-UI §6: log out (public since contract 0.1.0, so it works with an expired access cookie),
 * then drop every cached query and record "signed out", so /signin does not ask auth/me again.
 * The cache is cleared even when logout fails; the caller tells the learner they may still be
 * signed in on this device.
 */
export function useSignOut() {
  const client = useQueryClient();
  return useMutation<unknown, ApiError>({
    mutationFn: logout,
    retry: shouldRetrySignOut,
    retryDelay: signOutRetryDelay,
    onSettled: () => {
      client.clear();
      client.setQueryData(sessionKeys.me(), null);
    },
  });
}
