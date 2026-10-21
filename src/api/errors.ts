import { isAxiosError, isCancel } from 'axios';
import type { Problem, ProblemCode } from './types';

/** Client-side failures that never reach the API's problem+json filter. */
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELED' | 'UNKNOWN';
export type ApiErrorCode = ProblemCode | ClientErrorCode;

export interface ApiErrorInit {
  status: number;
  code: ApiErrorCode;
  title: string;
  detail?: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
  retryAfterMs?: number;
}

/** The single error type every endpoint call rejects with. `status` is 0 when no response arrived. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly title: string;
  readonly detail: string | undefined;
  readonly fieldErrors: Record<string, string>;
  readonly requestId: string | undefined;
  readonly retryAfterMs: number | undefined;

  constructor(init: ApiErrorInit) {
    super(init.detail ?? init.title);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.title = init.title;
    this.detail = init.detail;
    this.fieldErrors = init.fieldErrors ?? {};
    this.requestId = init.requestId;
    this.retryAfterMs = init.retryAfterMs;
  }
}

// Keyed by the generated ProblemCode union: `satisfies Record<ProblemCode, true>` fails typecheck
// when the contract adds or removes a code (after `pnpm api:types`), so this cannot drift.
const PROBLEM_CODE_KEYS = {
  VALIDATION_FAILED: true,
  UNAUTHENTICATED: true,
  SESSION_REVOKED: true,
  FORBIDDEN: true,
  NOT_FOUND: true,
  CONFLICT: true,
  EMAIL_TAKEN: true,
  IDEMPOTENCY_MISMATCH: true,
  QUOTA_EXCEEDED: true,
  RATE_LIMITED: true,
  AI_BUDGET_EXCEEDED: true,
  NO_REPLACEMENT: true,
  CSRF_REJECTED: true,
  REFRESH_CONCURRENT: true,
  INTERNAL: true,
} as const satisfies Record<ProblemCode, true>;

export const PROBLEM_CODES: ReadonlySet<string> = new Set(Object.keys(PROBLEM_CODE_KEYS));

/** Fallback code when a response is not problem+json (e.g. a proxy's HTML 502). */
function codeForStatus(status: number): ProblemCode {
  switch (status) {
    case 400:
      return 'VALIDATION_FAILED';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'INTERNAL';
  }
}

function isProblem(body: unknown): body is Problem {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.title === 'string' && typeof b.code === 'string' && PROBLEM_CODES.has(b.code);
}

/** Parses Retry-After as delta-seconds or an HTTP date. */
export function parseRetryAfter(value: unknown, now = Date.now()): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

function header(headers: unknown, name: string): unknown {
  if (typeof headers !== 'object' || headers === null) return undefined;
  return (headers as Record<string, unknown>)[name];
}

function toFieldErrors(problem: Problem): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { field, message } of problem.errors ?? []) out[field] ??= message;
  return out;
}

/** Maps anything thrown by Axios (or our own code) to an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isCancel(error)) {
    return new ApiError({ status: 0, code: 'CANCELED', title: 'Request canceled' });
  }

  if (!isAxiosError(error)) {
    const detail = error instanceof Error ? error.message : undefined;
    return new ApiError({ status: 0, code: 'UNKNOWN', title: 'Unexpected error', detail });
  }

  const sentRequestId = header(error.config?.headers, 'X-Request-Id');
  const response = error.response;

  if (!response) {
    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    return new ApiError({
      status: 0,
      code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
      title: timedOut ? 'The server took too long to respond' : 'Could not reach the server',
      requestId: typeof sentRequestId === 'string' ? sentRequestId : undefined,
    });
  }

  const retryAfterMs = parseRetryAfter(header(response.headers, 'retry-after'));
  const responseRequestId = header(response.headers, 'x-request-id');
  const fallbackRequestId =
    typeof responseRequestId === 'string'
      ? responseRequestId
      : typeof sentRequestId === 'string'
        ? sentRequestId
        : undefined;

  const body: unknown = response.data;
  if (isProblem(body)) {
    return new ApiError({
      status: response.status,
      code: body.code,
      title: body.title,
      detail: body.detail,
      fieldErrors: toFieldErrors(body),
      requestId: body.requestId || fallbackRequestId,
      retryAfterMs,
    });
  }

  return new ApiError({
    status: response.status,
    code: codeForStatus(response.status),
    title: response.statusText || `Request failed with status ${response.status}`,
    requestId: fallbackRequestId,
    retryAfterMs,
  });
}
