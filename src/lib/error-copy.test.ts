import { describe, expect, it } from 'vitest';
import { ApiError, type ApiErrorCode } from '@/api/errors';
import { errorCopy } from './error-copy';

const e = (status: number, code: ApiErrorCode) => new ApiError({ status, code, title: 't' });

describe('errorCopy', () => {
  it.each([
    [e(0, 'NETWORK_ERROR'), /could not reach the server/],
    [e(0, 'TIMEOUT'), /could not reach the server/],
    [e(404, 'NOT_FOUND'), /no longer exists/],
    [e(403, 'FORBIDDEN'), /do not have access/],
    [e(500, 'INTERNAL'), /Something went wrong/],
  ])('%s', (error, text) => {
    expect(errorCopy(error)).toMatch(text);
  });
});
