import { env } from '@/lib/env';
import { trackActivity } from './activity';
import { createHttpClient, type HttpClient } from './http';
import { installInterceptors, type InterceptorOptions } from './interceptors';
import { emitSessionExpired } from './session-events';

export const DEFAULT_TIMEOUT_MS = 15_000;
export const UPLOAD_TIMEOUT_MS = 60_000;

export interface ApiClientOptions extends InterceptorOptions {
  baseURL: string;
}

/** Builds the HTTP client with the PRD-UI §5 rules. Components never use it directly. */
export function createApiClient({ baseURL, ...options }: ApiClientOptions): HttpClient {
  const instance = createHttpClient({
    baseURL,
    withCredentials: true,
    timeout: DEFAULT_TIMEOUT_MS,
    headers: { Accept: 'application/json, application/problem+json' },
  });
  trackActivity(instance);
  installInterceptors(instance, options);
  return instance;
}

/** The app's single API instance, used only by src/api/endpoints. */
export const api = createApiClient({
  baseURL: env.apiUrl,
  onSessionExpired: emitSessionExpired,
});
