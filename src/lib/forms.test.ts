import type { Resolver } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/errors';
import { applyFieldErrors, lazyResolver } from './forms';

interface Values {
  email: string;
}

describe('lazyResolver', () => {
  it('loads the real resolver once, on preload or first use', async () => {
    const inner = vi.fn<Resolver<Values>>(() => ({ values: { email: 'a@b.co' }, errors: {} }));
    const load = vi.fn(() => Promise.resolve(inner));
    const resolver = lazyResolver<Values>(load);

    expect(load).not.toHaveBeenCalled();
    resolver.preload();
    resolver.preload();
    const options = { fields: {}, shouldUseNativeValidation: false };
    await expect(resolver({ email: 'a@b.co' }, undefined, options)).resolves.toEqual({
      values: { email: 'a@b.co' },
      errors: {},
    });
    await resolver({ email: 'x' }, undefined, options);
    expect(load).toHaveBeenCalledTimes(1);
    expect(inner).toHaveBeenCalledTimes(2);
  });
});

describe('applyFieldErrors', () => {
  it('sets only known fields and reports whether any matched', () => {
    const setError = vi.fn();
    const error = new ApiError({
      status: 400,
      code: 'VALIDATION_FAILED',
      title: 't',
      fieldErrors: { email: 'Bad email', other: 'ignored' },
    });
    expect(applyFieldErrors<Values>(error, ['email'], setError)).toBe(true);
    expect(setError).toHaveBeenCalledExactlyOnceWith('email', { type: 'server', message: 'Bad email' });
    expect(applyFieldErrors<Values>(new ApiError({ status: 500, code: 'INTERNAL', title: 't' }), ['email'], setError)).toBe(false);
  });
});
