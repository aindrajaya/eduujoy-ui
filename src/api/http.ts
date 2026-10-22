// A small fetch-based HTTP client with the part of Axios's interface the app used: request and
// response interceptors, a replayable `request(config)`, params, JSON or Blob bodies, a timeout,
// and cookies on every call. perf/entry-headroom: Axios was 19.9 KB of every screen's initial JS.

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestConfig {
  url?: string;
  method?: Method;
  baseURL?: string;
  /** Flat query values; undefined and null are left out. */
  params?: object;
  data?: unknown;
  headers: Headers;
  timeout?: number;
  signal?: AbortSignal;
  responseType?: 'json' | 'blob';
  withCredentials?: boolean;
  /** Set once a request has been replayed after a session refresh (interceptors.ts). */
  _retried?: boolean;
}

/** What callers pass: headers as a plain object (or Headers), everything else optional. */
export type RequestOptions = Omit<Partial<RequestConfig>, 'headers'> & { headers?: HeadersInit };

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  /** Lower-cased names. */
  headers: Partial<Record<string, string>>;
  config: RequestConfig;
}

export type HttpErrorCode = 'ERR_BAD_RESPONSE' | 'ERR_BAD_REQUEST' | 'ERR_NETWORK' | 'ECONNABORTED' | 'ERR_CANCELED';

/** A failed request: a non-2xx response, a network failure, a timeout or a cancellation. */
export class HttpError extends Error {
  readonly code: HttpErrorCode;
  readonly config: RequestConfig;
  readonly response: HttpResponse | undefined;

  constructor(message: string, code: HttpErrorCode, config: RequestConfig, response?: HttpResponse) {
    super(message);
    this.name = 'HttpError';
    this.code = code;
    this.config = config;
    this.response = response;
  }
}

export const isHttpError = (error: unknown): error is HttpError => error instanceof HttpError;

/**
 * A Blob from any realm. `instanceof Blob` fails across realms (jsdom's Blob and Node's fetch Blob
 * in tests, frames in browsers), so a Blob body would be JSON-encoded by mistake. Checks only what
 * every Blob has (jsdom's has no text() or arrayBuffer()).
 */
export const isBlobLike = (value: unknown): value is Blob =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Blob).size === 'number' &&
  typeof (value as Blob).type === 'string' &&
  typeof (value as Blob).slice === 'function';

type Fulfilled<T> = (value: T) => T | Promise<T>;
type Rejected = (error: unknown) => unknown;

interface InterceptorSet<T> {
  use: (fulfilled?: Fulfilled<T>, rejected?: Rejected) => void;
}

export interface HttpClient {
  defaults: { baseURL?: string; timeout: number; withCredentials: boolean; headers: Record<string, string> };
  interceptors: { request: InterceptorSet<RequestConfig>; response: InterceptorSet<HttpResponse> };
  request: <T = unknown>(config: RequestConfig | RequestOptions) => Promise<HttpResponse<T>>;
  get: <T = unknown>(url: string, options?: RequestOptions) => Promise<HttpResponse<T>>;
  delete: <T = unknown>(url: string, options?: RequestOptions) => Promise<HttpResponse<T>>;
  post: <T = unknown>(url: string, data?: unknown, options?: RequestOptions) => Promise<HttpResponse<T>>;
  patch: <T = unknown>(url: string, data?: unknown, options?: RequestOptions) => Promise<HttpResponse<T>>;
}

function buildUrl(config: RequestConfig): string {
  const base = config.baseURL ? config.baseURL.replace(/\/$/, '') : '';
  const path = config.url ?? '';
  const absolute = /^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//');
  // Every call goes to the API. An absolute URL is allowed only on the API's own origin, so a stray
  // one can never carry the cookies or the CSRF header anywhere else.
  if (absolute) {
    const target = new URL(path, base || undefined);
    if (!base || target.origin !== new URL(base).origin) {
      throw new HttpError(`Refusing a request outside the API origin: ${target.origin}`, 'ERR_BAD_REQUEST', config);
    }
  }
  const url = absolute ? path : `${base}${path}`;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(config.params ?? {}) as [string, unknown][]) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      query.append(key, String(value));
    }
  }
  const qs = query.toString();
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}

function encodeBody(config: RequestConfig): BodyInit | undefined {
  const { data } = config;
  if (data === undefined) return undefined;
  if (typeof data === 'string' || isBlobLike(data) || data instanceof FormData) return data;
  if (!config.headers.has('Content-Type')) config.headers.set('Content-Type', 'application/json');
  return JSON.stringify(data);
}

async function readBody(res: Response, config: RequestConfig): Promise<unknown> {
  if (res.status === 204 || res.status === 205) return undefined;
  // Error bodies are read as text so problem+json is available even for a Blob request.
  if (config.responseType === 'blob' && res.ok) return res.blob();
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function dispatch(config: RequestConfig): Promise<HttpResponse> {
  // The interceptor chain is async, so the caller may have aborted before the request is sent.
  if (config.signal?.aborted) throw new HttpError('Request canceled', 'ERR_CANCELED', config);
  const url = buildUrl(config);
  const controller = new AbortController();
  // An object, so TypeScript does not narrow the flag set inside the timer to always false.
  const state = { timedOut: false };
  const timer = config.timeout
    ? setTimeout(() => {
        state.timedOut = true;
        controller.abort();
      }, config.timeout)
    : undefined;
  const onAbort = () => {
    controller.abort();
  };
  config.signal?.addEventListener('abort', onAbort);

  try {
    let res: Response;
    try {
      res = await fetch(url, {
        method: config.method ?? 'GET',
        headers: config.headers,
        body: encodeBody(config),
        credentials: config.withCredentials ? 'include' : 'same-origin',
        signal: controller.signal,
      });
    } catch {
      if (state.timedOut) throw new HttpError(`Timeout of ${String(config.timeout)} ms exceeded`, 'ECONNABORTED', config);
      if (config.signal?.aborted) throw new HttpError('Request canceled', 'ERR_CANCELED', config);
      throw new HttpError('Network Error', 'ERR_NETWORK', config);
    }
    const headers: Partial<Record<string, string>> = {};
    res.headers.forEach((value, name) => {
      headers[name.toLowerCase()] = value;
    });
    const response: HttpResponse = {
      data: await readBody(res, config),
      status: res.status,
      statusText: res.statusText,
      headers,
      config,
    };
    if (res.status < 200 || res.status >= 300) {
      throw new HttpError(`Request failed with status code ${String(res.status)}`, 'ERR_BAD_RESPONSE', config, response);
    }
    return response;
  } finally {
    if (timer) clearTimeout(timer);
    config.signal?.removeEventListener('abort', onAbort);
  }
}

export function createHttpClient(defaults: Partial<HttpClient['defaults']> = {}): HttpClient {
  const requestHandlers: { fulfilled?: Fulfilled<RequestConfig>; rejected?: Rejected }[] = [];
  const responseHandlers: { fulfilled?: Fulfilled<HttpResponse>; rejected?: Rejected }[] = [];
  const settings: HttpClient['defaults'] = {
    timeout: 0,
    withCredentials: false,
    headers: {},
    ...defaults,
  };

  const toConfig = (options: RequestConfig | RequestOptions): RequestConfig => {
    const headers = new Headers(settings.headers);
    new Headers(options.headers).forEach((value, name) => {
      headers.set(name, value);
    });
    return {
      baseURL: settings.baseURL,
      timeout: settings.timeout,
      withCredentials: settings.withCredentials,
      ...options,
      headers,
    };
  };

  const request = <T,>(options: RequestConfig | RequestOptions): Promise<HttpResponse<T>> => {
    // Like Axios: request interceptors run last-added first, response interceptors in order.
    let chain: Promise<unknown> = Promise.resolve(toConfig(options));
    for (const handler of [...requestHandlers].reverse()) {
      chain = chain.then(handler.fulfilled as (value: unknown) => unknown, handler.rejected);
    }
    chain = chain.then((config) => dispatch(config as RequestConfig));
    for (const handler of responseHandlers) {
      chain = chain.then(handler.fulfilled as (value: unknown) => unknown, handler.rejected);
    }
    return chain as Promise<HttpResponse<T>>;
  };

  return {
    defaults: settings,
    interceptors: {
      request: { use: (fulfilled, rejected) => void requestHandlers.push({ fulfilled, rejected }) },
      response: { use: (fulfilled, rejected) => void responseHandlers.push({ fulfilled, rejected }) },
    },
    request,
    get: (url, options = {}) => request({ ...options, url, method: 'GET' }),
    delete: (url, options = {}) => request({ ...options, url, method: 'DELETE' }),
    post: (url, data, options = {}) => request({ ...options, url, method: 'POST', data }),
    patch: (url, data, options = {}) => request({ ...options, url, method: 'PATCH', data }),
  };
}
