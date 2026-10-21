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

/** PRD-UI §6: log out, then drop every cached query (session, paths, progress). */
export function useSignOut() {
  const client = useQueryClient();
  return useMutation<unknown, ApiError>({
    mutationFn: logout,
    onSettled: () => {
      client.clear();
    },
  });
}
