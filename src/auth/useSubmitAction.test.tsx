import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSubmitAction } from './useSubmitAction';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useSubmitAction', () => {
  it('goes idle → pending → success and calls onSuccess with the data', async () => {
    const call = deferred<string>();
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useSubmitAction<string, Error, number>(() => call.promise, onSuccess));
    expect(result.current.isIdle).toBe(true);
    act(() => {
      result.current.mutate(1);
    });
    expect(result.current.isPending).toBe(true);
    await act(async () => {
      call.resolve('ok');
      await call.promise;
    });
    expect(result.current).toMatchObject({ isSuccess: true, data: 'ok', error: null });
    expect(onSuccess).toHaveBeenCalledWith('ok');
  });

  it('keeps the error, and mutateAsync rejects with it', async () => {
    const boom = new Error('nope');
    const { result } = renderHook(() => useSubmitAction<string, Error, number>(() => Promise.reject(boom)));
    await act(async () => {
      await expect(result.current.mutateAsync(1)).rejects.toBe(boom);
    });
    expect(result.current).toMatchObject({ isError: true, error: boom });
  });

  it('the latest call wins: a stale answer never overwrites a newer one or runs onSuccess', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const calls = [first, second];
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useSubmitAction<string, Error, number>(() => calls.shift()!.promise, onSuccess));
    act(() => {
      result.current.mutate(1);
      result.current.mutate(2);
    });
    await act(async () => {
      second.resolve('new');
      await second.promise;
    });
    await act(async () => {
      first.resolve('old');
      await first.promise;
    });
    await waitFor(() => {
      expect(result.current.data).toBe('new');
    });
    // The stale first call resolved last: its success side effect never runs.
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledWith('new');
  });
});
