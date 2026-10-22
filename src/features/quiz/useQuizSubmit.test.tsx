import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/errors';
import { useQuizDispatch, useQuizState } from './context';
import QuizProvider from './QuizProvider';
import type { QuizQuestion } from './types';
import { isRetryable, useQuizSubmit, type QuizSubmitOptions } from './useQuizSubmit';

const questions: QuizQuestion[] = [{ id: 'q1', kind: 'short_answer', prompt: 'One?' }];
const network = () => new ApiError({ status: 0, code: 'NETWORK_ERROR', title: 'offline' });

function setup<R>(options: QuizSubmitOptions<R>) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QuizProvider quizId="q" questions={questions} idempotencyKey="attempt-key">
      {children}
    </QuizProvider>
  );
  return renderHook(
    () => ({ ...useQuizSubmit({ baseDelayMs: 1, ...options }), state: useQuizState(), dispatch: useQuizDispatch() }),
    { wrapper },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useQuizSubmit', () => {
  it('sends all answers with the attempt key and reports success', async () => {
    const submit = vi.fn().mockResolvedValue({ ok: true });
    const onSubmitted = vi.fn();
    const { result } = setup({ submit, onSubmitted });
    act(() => {
      result.current.dispatch({ type: 'COMMIT', questionId: 'q1', answer: { text: 'hi' } });
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(submit).toHaveBeenCalledWith({ q1: { text: 'hi' } }, 'attempt-key');
    expect(result.current.state.status).toBe('submitted');
    expect(onSubmitted).toHaveBeenCalledWith({ ok: true });
  });

  it('retries network errors up to 3 times with the same key, then succeeds', async () => {
    const submit = vi.fn().mockRejectedValueOnce(network()).mockRejectedValueOnce(network()).mockResolvedValue('ok');
    const { result } = setup({ submit });
    await act(async () => {
      await result.current.submit();
    });
    expect(submit).toHaveBeenCalledTimes(3);
    expect(new Set(submit.mock.calls.map((c) => c[1] as string))).toEqual(new Set(['attempt-key']));
    expect(result.current.state.status).toBe('submitted');
  });

  it('gives up after 3 retries and keeps the key for a manual retry', async () => {
    const submit = vi.fn().mockRejectedValue(network());
    const { result } = setup({ submit });
    await act(async () => {
      await result.current.submit();
    });
    expect(submit).toHaveBeenCalledTimes(4);
    expect(result.current.state).toMatchObject({ status: 'error', idempotencyKey: 'attempt-key' });
  });

  it('does not retry an exhausted AI budget, nor wait out a long Retry-After', async () => {
    const budget = new ApiError({ status: 503, code: 'AI_BUDGET_EXCEEDED', title: 'x', retryAfterMs: 5 * 3600_000 });
    const busy = new ApiError({ status: 503, code: 'INTERNAL', title: 'x', retryAfterMs: 60_000 });
    for (const error of [budget, busy]) {
      const submit = vi.fn().mockRejectedValue(error);
      const { result, unmount } = setup({ submit });
      await act(async () => {
        await result.current.submit();
      });
      expect(submit).toHaveBeenCalledOnce();
      expect(result.current.state.error?.code).toBe(error.code);
      unmount();
    }
    expect(isRetryable(budget)).toBe(false);
  });

  it('does not retry client errors', async () => {
    const submit = vi.fn().mockRejectedValue(new ApiError({ status: 409, code: 'CONFLICT', title: 'x' }));
    const { result } = setup({ submit });
    await act(async () => {
      await result.current.submit();
    });
    expect(submit).toHaveBeenCalledOnce();
    expect(result.current.state.error?.code).toBe('CONFLICT');
  });

  it('a second tap while submitting does not start a second attempt', async () => {
    let release: (v: string) => void = () => undefined;
    const submit = vi.fn(() => new Promise<string>((r) => { release = r; }));
    const { result } = setup({ submit });
    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.submit();
    });
    await act(async () => {
      await result.current.submit();
    });
    release('done');
    await act(async () => {
      await first;
    });
    expect(submit).toHaveBeenCalledOnce();
  });

  it('offline: queues until the online event (checkpoints)', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const submit = vi.fn().mockResolvedValue('ok');
    const { result } = setup({ submit, waitForOnline: true });
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.submit();
    });
    await waitFor(() => {
      expect(result.current.waitingForNetwork).toBe(true);
    });
    expect(submit).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe('submitting');
    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await pending;
    });
    expect(submit).toHaveBeenCalledOnce();
    expect(result.current).toMatchObject({ waitingForNetwork: false });
    expect(result.current.state.status).toBe('submitted');
  });
});

describe('isRetryable', () => {
  it.each([
    [0, 'NETWORK_ERROR', true],
    [0, 'CANCELED', false],
    [503, 'INTERNAL', true],
    [408, 'INTERNAL', true],
    [429, 'RATE_LIMITED', true],
    [400, 'VALIDATION_FAILED', false],
  ] as const)('%i %s → %s', (status, code, expected) => {
    expect(isRetryable(new ApiError({ status, code, title: 't' }))).toBe(expected);
  });
});
