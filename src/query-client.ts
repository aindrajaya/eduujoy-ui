import { QueryClient } from '@tanstack/react-query';
import { toApiError } from '@/api/errors';

const MAX_QUERY_RETRIES = 2;
const MAX_RETRY_DELAY_MS = 30_000;

/** PRD-UI §5: retry network errors, timeouts and 5xx; never 4xx except 408 and 429. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false;
  const { status, code } = toApiError(error);
  if (code === 'CANCELED') return false;
  if (status === 0 || status >= 500) return true;
  return status === 408 || status === 429;
}

/** Honours Retry-After when the API sends it; otherwise exponential backoff from 1 s. */
export function retryDelay(attempt: number, error: unknown): number {
  const { retryAfterMs } = toApiError(error);
  if (retryAfterMs !== undefined) return Math.min(retryAfterMs, MAX_RETRY_DELAY_MS);
  return Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        retryDelay,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: 0 },
    },
  });
}

/** The app's query client; route loaders and the session handler share it. */
export const queryClient = createQueryClient();
