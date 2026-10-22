import { describe, expect, it } from 'vitest';
import spec from '../../docs/openapi.json';
import { ApiError, PROBLEM_CODES, parseRetryAfter, toApiError } from './errors';
import { HttpError, type HttpErrorCode, type RequestConfig } from './http';

function httpError({
  status,
  data,
  headers = {},
  statusText = '',
  code,
  sentRequestId = 'req-sent',
}: {
  status?: number;
  data?: unknown;
  headers?: Record<string, string>;
  statusText?: string;
  code?: HttpErrorCode;
  sentRequestId?: string | null;
}): HttpError {
  const config: RequestConfig = { headers: new Headers(sentRequestId ? { 'X-Request-Id': sentRequestId } : {}) };
  const response = status === undefined ? undefined : { status, statusText, data, headers, config };
  return new HttpError('boom', code ?? (status === undefined ? 'ERR_NETWORK' : 'ERR_BAD_RESPONSE'), config, response);
}

const problem = {
  type: 'https://api.eduujoy.aindrajaya.my.id/problems/validation',
  title: 'Validation failed',
  status: 400,
  code: 'VALIDATION_FAILED',
  detail: 'Two fields are invalid',
  requestId: 'req-api',
  errors: [
    { field: 'email', message: 'Email is invalid' },
    { field: 'email', message: 'Second message ignored' },
    { field: 'answers.3.value', message: 'Required' },
  ],
};

describe('toApiError', () => {
  it('maps problem+json with field errors and the API request id', () => {
    const e = toApiError(httpError({ status: 400, data: problem }));
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      title: 'Validation failed',
      detail: 'Two fields are invalid',
      requestId: 'req-api',
      fieldErrors: { email: 'Email is invalid', 'answers.3.value': 'Required' },
    });
    expect(e.message).toBe('Two fields are invalid');
  });

  it('uses the title as message and empty field errors when a problem has neither', () => {
    const bare = { type: problem.type, status: 404, code: 'NOT_FOUND', title: 'Not found', requestId: 'r' };
    const e = toApiError(httpError({ status: 404, data: bare }));
    expect(e.message).toBe('Not found');
    expect(e.fieldErrors).toEqual({});
  });

  it('falls back to the response then the sent request id when the body has none', () => {
    const body = { ...problem, requestId: '' };
    expect(toApiError(httpError({ status: 400, data: body, headers: { 'x-request-id': 'req-hdr' } })).requestId).toBe('req-hdr');
    expect(toApiError(httpError({ status: 400, data: body })).requestId).toBe('req-sent');
    expect(toApiError(httpError({ status: 400, data: body, sentRequestId: null })).requestId).toBeUndefined();
  });

  it('reads Retry-After on 429', () => {
    const e = toApiError(
      httpError({
        status: 429,
        data: { ...problem, status: 429, code: 'RATE_LIMITED', title: 'Slow down' },
        headers: { 'retry-after': '3' },
      }),
    );
    expect(e.code).toBe('RATE_LIMITED');
    expect(e.retryAfterMs).toBe(3000);
  });

  it.each([
    [400, 'VALIDATION_FAILED'],
    [401, 'UNAUTHENTICATED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [429, 'RATE_LIMITED'],
    [502, 'INTERNAL'],
    [503, 'SERVICE_UNAVAILABLE'],
  ] as const)('maps a non-problem %i to %s', (status, code) => {
    const e = toApiError(httpError({ status, data: '<html>bad gateway</html>', statusText: 'Bad' }));
    expect(e).toMatchObject({ status, code, title: 'Bad', requestId: 'req-sent' });
  });

  it('ignores bodies with unknown codes or wrong shapes', () => {
    expect(toApiError(httpError({ status: 500, data: { ...problem, code: 'WHAT' } })).code).toBe('INTERNAL');
    expect(toApiError(httpError({ status: 500, data: null })).title).toBe('Request failed with status 500');
    expect(toApiError(httpError({ status: 500, data: { title: 1 } })).code).toBe('INTERNAL');
  });

  it('maps timeouts and network failures without a response', () => {
    expect(toApiError(httpError({ code: 'ECONNABORTED' }))).toMatchObject({ status: 0, code: 'TIMEOUT', requestId: 'req-sent' });
    expect(toApiError(httpError({ code: 'ERR_NETWORK', sentRequestId: null }))).toMatchObject({
      code: 'NETWORK_ERROR',
      requestId: undefined,
    });
  });

  it('maps cancellations, plain errors and non-errors', () => {
    expect(toApiError(httpError({ code: 'ERR_CANCELED' })).code).toBe('CANCELED');
    expect(toApiError(httpError({ code: 'ERR_BAD_REQUEST' }))).toMatchObject({ code: 'UNKNOWN', title: 'Request not sent' });
    expect(toApiError(new Error('oops'))).toMatchObject({ code: 'UNKNOWN', detail: 'oops' });
    expect(toApiError('weird')).toMatchObject({ code: 'UNKNOWN', detail: undefined });
  });

  it('returns an existing ApiError unchanged', () => {
    const e = new ApiError({ status: 409, code: 'CONFLICT', title: 'Conflict' });
    expect(toApiError(e)).toBe(e);
  });
});

describe('parseRetryAfter', () => {
  it('parses seconds and HTTP dates, clamping negatives', () => {
    const now = Date.parse('2026-10-21T00:00:00Z');
    expect(parseRetryAfter('2', now)).toBe(2000);
    expect(parseRetryAfter('Wed, 21 Oct 2026 00:00:05 GMT', now)).toBe(5000);
    expect(parseRetryAfter('Tue, 20 Oct 2026 00:00:00 GMT', now)).toBe(0);
    expect(parseRetryAfter('-5', now)).toBe(0);
  });

  it('returns undefined for missing or invalid values', () => {
    expect(parseRetryAfter(undefined)).toBeUndefined();
    expect(parseRetryAfter('')).toBeUndefined();
    expect(parseRetryAfter('soon')).toBeUndefined();
  });
});

describe('PROBLEM_CODES', () => {
  it('matches the ProblemCode enum in docs/openapi.json exactly', () => {
    expect([...PROBLEM_CODES].sort()).toEqual([...spec.components.schemas.ProblemCode.enum].sort());
  });
});
