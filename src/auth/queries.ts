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

/**
 * PRD-UI §6: log out (public since contract 0.1.0, so it works with an expired access cookie),
 * then drop every cached query and record "signed out", so /signin does not ask auth/me again.
 */
export function useSignOut() {
  const client = useQueryClient();
  return useMutation<unknown, ApiError>({
    mutationFn: logout,
    onSettled: () => {
      client.clear();
      client.setQueryData(sessionKeys.me(), null);
    },
  });
}
