import { isAxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { toApiError, type ApiError } from './errors';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Set once a request has been replayed after a token refresh. */
    _retried?: boolean;
  }
}

export interface SessionExpiredContext {
  /** The request whose 401 triggered the failed refresh. */
  url: string | undefined;
  error: ApiError;
}

export interface InterceptorOptions {
  /** Called once per failed refresh (refresh answered 401/403). U2 routes to /signin?next=…. */
  onSessionExpired?: (ctx: SessionExpiredContext) => void;
}

export const REFRESH_URL = '/v1/auth/refresh';

// A 401 from these means "wrong credentials" or "already signed out", never "access token expired".
// /v1/auth/me is deliberately not listed: a cold start with an expired access cookie must refresh.
const NO_REFRESH = ['/v1/auth/refresh', '/v1/auth/login', '/v1/auth/register', '/v1/auth/logout'];

function skipsRefresh(url: string | undefined): boolean {
  if (!url) return false;
  return NO_REFRESH.some((path) => url.endsWith(path) || url.includes(`${path}?`));
}

function addRequestHeaders(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  if (!config.headers.has('X-Request-Id')) config.headers.set('X-Request-Id', crypto.randomUUID());
  // CSRF guard the API requires on unsafe methods; harmless on safe ones.
  config.headers.set('X-Requested-With', 'eduujoy');
  return config;
}

/**
 * Installs the request interceptor (request id, CSRF header) and the response interceptor
 * (problem+json mapping, one shared refresh for concurrent 401s, one replay per request).
 */
export function installInterceptors(instance: AxiosInstance, options: InterceptorOptions = {}): void {
  let refreshing: Promise<void> | null = null;

  // Concurrent 401s share one refresh; expiry is reported once per failed refresh, not per waiter.
  const refreshOnce = (url: string | undefined): Promise<void> => {
    refreshing ??= instance
      .post(REFRESH_URL)
      .then(
        () => undefined,
        (refreshError: unknown) => {
          const error = toApiError(refreshError);
          if (error.status === 401 || error.status === 403) {
            options.onSessionExpired?.({ url, error });
          }
          throw error;
        },
      )
      .finally(() => {
        refreshing = null;
      });
    return refreshing;
  };

  instance.interceptors.request.use(addRequestHeaders);

  instance.interceptors.response.use(undefined, async (error: unknown) => {
    if (!isAxiosError(error) || !error.config) throw toApiError(error);
    const original = error.config;

    if (error.response?.status !== 401 || original._retried || skipsRefresh(original.url)) {
      throw toApiError(error);
    }
    original._retried = true;

    await refreshOnce(original.url);
    return instance.request(original);
  });
}
