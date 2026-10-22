import { queryOptions, useQuery } from '@tanstack/react-query';
import { getMe } from '@/api/endpoints/auth';
import { toApiError } from '@/api/errors';
import type { Me, Role } from '@/api/types';

export const sessionKeys = {
  all: ['auth'] as const,
  me: () => [...sessionKeys.all, 'me'] as const,
};

/** The signed-in user, or null when signed out. Other failures (network, 5xx) still throw. */
export async function fetchSession(): Promise<Me | null> {
  try {
    return await getMe();
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 401) return null;
    throw apiError;
  }
}

// PRD-UI §5/§6: auth/me is cached for 5 minutes and lives only in the query cache.
export const sessionQuery = queryOptions({
  queryKey: sessionKeys.me(),
  queryFn: fetchSession,
  staleTime: 5 * 60_000,
});

export function useSession() {
  return useQuery(sessionQuery);
}

export function hasRole(me: Me | null | undefined, roles: readonly Role[]): boolean {
  return Boolean(me?.roles.some((role) => roles.includes(role)));
}
