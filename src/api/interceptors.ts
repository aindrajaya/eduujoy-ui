import { toApiError, type ApiError } from './errors';
import { isHttpError, type HttpClient, type RequestConfig } from './http';

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

function addRequestHeaders(config: RequestConfig): RequestConfig {
  if (!config.headers.has('X-Request-Id')) config.headers.set('X-Request-Id', crypto.randomUUID());
  // CSRF guard the API requires on unsafe methods; harmless on safe ones.
  config.headers.set('X-Requested-With', 'eduujoy');
  return config;
}

/** How long to wait after a 409 REFRESH_CONCURRENT so the other tab's Set-Cookie lands first. */
export const CONCURRENT_REFRESH_SETTLE_MS = 250;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Installs the request interceptor (request id, CSRF header) and the response interceptor
 * (problem+json mapping, one shared refresh for concurrent 401s, one replay per request).
 */
export function installInterceptors(instance: HttpClient, options: InterceptorOptions = {}): void {
  let refreshing: Promise<void> | null = null;
  // The refresh cycle that last reported expiry, so many waiters on one cycle report it once.
  let currentCycle: Promise<void> | null = null;
  let reportedCycle: Promise<void> | null = null;

  const reportExpired = (url: string | undefined, error: ApiError) => {
    if (reportedCycle === currentCycle) return;
    reportedCycle = currentCycle;
    options.onSessionExpired?.({ url, error });
  };

  // Concurrent 401s share one refresh; expiry is reported once per refresh cycle, not per waiter.
  const refreshOnce = (url: string | undefined): Promise<void> => {
    if (!refreshing) {
      refreshing = instance
        .post(REFRESH_URL)
        .then(
          () => undefined,
          async (refreshError: unknown) => {
            const error = toApiError(refreshError);
            // Another tab refreshed the same token inside the API's 10 s grace window and the
            // cookies are already rotated: let its Set-Cookie land, then replay. Not a sign-out.
            if (error.status === 409 && error.code === 'REFRESH_CONCURRENT') {
              await wait(CONCURRENT_REFRESH_SETTLE_MS);
              return;
            }
            if (error.status === 401 || error.status === 403) reportExpired(url, error);
            throw error;
          },
        )
        .finally(() => {
          refreshing = null;
        });
      currentCycle = refreshing;
    }
    return refreshing;
  };

  instance.interceptors.request.use(addRequestHeaders);

  instance.interceptors.response.use(undefined, async (error: unknown) => {
    if (!isHttpError(error)) throw toApiError(error);
    const original = error.config;

    if (error.response?.status !== 401 || skipsRefresh(original.url)) throw toApiError(error);

    // Contract 0.6.0: REAUTH_REQUIRED (DELETE /v1/me) asks for a fresh sign-in. A refresh would keep
    // the old sign-in time and could never satisfy it, so the caller sends the learner to /signin.
    const problem = toApiError(error);
    if (problem.code === 'REAUTH_REQUIRED') throw problem;

    // A 401 on the replay after a refresh means the session is gone: treat it as signed out.
    if (original._retried) {
      const apiError = toApiError(error);
      reportExpired(original.url, apiError);
      throw apiError;
    }
    original._retried = true;

    await refreshOnce(original.url);
    return instance.request(original);
  });
}
