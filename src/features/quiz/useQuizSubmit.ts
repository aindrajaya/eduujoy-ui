import { useCallback, useEffect, useRef, useState } from 'react';
import { toApiError, type ApiError } from '@/api/errors';
import { useQuizDispatch, useQuizState } from './context';
import type { Answer } from './types';

export interface QuizSubmitOptions<R> {
  /** Sends the whole batch; receives the attempt's idempotency key (reused on every retry). */
  submit: (answers: Record<string, Answer>, idempotencyKey: string) => Promise<R>;
  /** PRD-UI §7: up to 3 retries for network, 5xx, 408 and 429. */
  retries?: number;
  /** Checkpoints: when offline, queue the submit until the browser fires `online`. */
  waitForOnline?: boolean;
  onSubmitted?: (result: R) => void;
  /** Base backoff (doubles per attempt, max 8 s); Retry-After wins when present. */
  baseDelayMs?: number;
}

export function isRetryable(error: ApiError): boolean {
  if (error.code === 'CANCELED') return false;
  return error.status === 0 || error.status >= 500 || error.status === 408 || error.status === 429;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

function onceOnline(): Promise<void> {
  return new Promise((resolve) => {
    window.addEventListener(
      'online',
      () => {
        resolve();
      },
      { once: true },
    );
  });
}

/** Batch submission for a quiz (PRD-UI §7, "Batch submission"). */
export function useQuizSubmit<R>({
  submit,
  retries = 3,
  waitForOnline = false,
  onSubmitted,
  baseDelayMs = 1000,
}: QuizSubmitOptions<R>) {
  const state = useQuizState();
  const dispatch = useQuizDispatch();
  const [waitingForNetwork, setWaitingForNetwork] = useState(false);
  const latest = useRef(state);
  const mounted = useRef(true);

  useEffect(() => {
    latest.current = state;
  }, [state]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    const { status, answers, idempotencyKey } = latest.current;
    // A second tap cannot start a second attempt.
    if (status === 'submitting' || status === 'submitted') return;
    dispatch({ type: 'SUBMIT' });

    if (waitForOnline && !navigator.onLine) {
      setWaitingForNetwork(true);
      await onceOnline();
      if (mounted.current) setWaitingForNetwork(false);
    }

    for (let attempt = 0; ; attempt += 1) {
      try {
        const result = await submit(answers, idempotencyKey);
        if (!mounted.current) return;
        dispatch({ type: 'SUBMITTED' });
        onSubmitted?.(result);
        return;
      } catch (e) {
        const error = toApiError(e);
        if (attempt >= retries || !isRetryable(error)) {
          if (mounted.current) dispatch({ type: 'FAILED', error });
          return;
        }
        await sleep(error.retryAfterMs ?? Math.min(baseDelayMs * 2 ** attempt, 8000));
        if (!mounted.current) return;
      }
    }
  }, [baseDelayMs, dispatch, onSubmitted, retries, submit, waitForOnline]);

  return { submit: run, waitingForNetwork };
}
