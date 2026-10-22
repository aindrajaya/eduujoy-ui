import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login, logout, register } from '@/api/endpoints/auth';
import type { ApiError } from '@/api/errors';
import type { LoginRequest, Me, RegisterRequest } from '@/api/types';
import { sessionKeys } from './session';

export function useSignIn() {
  const client = useQueryClient();
  return useMutation<Me, ApiError, LoginRequest>({
    mutationFn: login,
    onSuccess: (me) => {
      client.setQueryData(sessionKeys.me(), me);
    },
  });
}

export function useSignUp() {
  const client = useQueryClient();
  return useMutation<Me, ApiError, RegisterRequest>({
    mutationFn: register,
    onSuccess: (me) => {
      client.setQueryData(sessionKeys.me(), me);
    },
  });
}

/** Logout is idempotent, so network and 5xx failures are retried twice (0.5 s, then 1 s). */
export function shouldRetrySignOut(failureCount: number, error: ApiError): boolean {
  return failureCount < 2 && (error.status === 0 || error.status >= 500);
}

export const signOutRetryDelay = (attempt: number) => 500 * 2 ** attempt;

/** Passed to /signin in router state when logout never reached the server. */
export interface SignInLocationState {
  signOutFailed?: boolean;
  /** Set after DELETE /v1/me succeeded (contract 0.6.0). */
  accountDeleted?: boolean;
}

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
