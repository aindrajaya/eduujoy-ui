import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { login, register } from '@/api/endpoints/auth';
import type { ApiError } from '@/api/errors';
import type { LoginRequest, Me, RegisterRequest } from '@/api/types';
import { sessionKeys } from './session';
import { useSubmitAction } from './useSubmitAction';

/** Stores the session the API returned, so screens read it without asking auth/me again. */
function useStoreSession() {
  const client = useQueryClient();
  return useCallback(
    (me: Me) => {
      client.setQueryData(sessionKeys.me(), me);
    },
    [client],
  );
}

export const useSignIn = () => useSubmitAction<Me, ApiError, LoginRequest>(login, useStoreSession());

export const useSignUp = () => useSubmitAction<Me, ApiError, RegisterRequest>(register, useStoreSession());

/** Passed to /signin in router state when logout never reached the server. */
export interface SignInLocationState {
  signOutFailed?: boolean;
  /** Set after DELETE /v1/me succeeded (contract 0.6.0). */
  accountDeleted?: boolean;
}
