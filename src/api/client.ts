import axios, { type AxiosInstance } from 'axios';
import { env } from '@/lib/env';
import { installInterceptors, type InterceptorOptions } from './interceptors';

export const DEFAULT_TIMEOUT_MS = 15_000;
export const UPLOAD_TIMEOUT_MS = 60_000;

export interface ApiClientOptions extends InterceptorOptions {
  baseURL: string;
}

/** Builds an Axios instance with the PRD-UI §5 rules. Components never use it directly. */
export function createApiClient({ baseURL, ...options }: ApiClientOptions): AxiosInstance {
  const instance = axios.create({
    baseURL,
    withCredentials: true,
    timeout: DEFAULT_TIMEOUT_MS,
    headers: { Accept: 'application/json, application/problem+json' },
  });
  installInterceptors(instance, options);
  return instance;
}

type SessionExpiredHandler = NonNullable<InterceptorOptions['onSessionExpired']>;
let sessionExpiredHandler: SessionExpiredHandler | undefined;

/** Registers what happens when a refresh fails (U2: clear the cache, go to /signin?next=…). */
export function setSessionExpiredHandler(handler: SessionExpiredHandler | undefined): void {
  sessionExpiredHandler = handler;
}

/** The app's single API instance, used only by src/api/endpoints. */
export const api = createApiClient({
  baseURL: env.apiUrl,
  onSessionExpired: (ctx) => sessionExpiredHandler?.(ctx),
});
