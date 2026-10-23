import { useCallback, useRef, useState } from 'react';

type Status = 'idle' | 'pending' | 'success' | 'error';

export interface SubmitAction<TData, TError, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  error: TError | null;
  isIdle: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
}

/**
 * The part of TanStack's useMutation that sign-in and sign-up use: one call, its pending, success
 * and error state. useMutation and its MutationObserver were the largest app-side cost on /signin's
 * initial JS (perf/signin-cleanup); these forms never retry and never share mutation state.
 */
export function useSubmitAction<TData, TError, TVariables>(
  fn: (variables: TVariables) => Promise<TData>,
  onSuccess?: (data: TData) => void,
): SubmitAction<TData, TError, TVariables> {
  const [state, setState] = useState<{ status: Status; data?: TData; error: TError | null }>({
    status: 'idle',
    error: null,
  });
  // The latest call wins: a stale response never overwrites a newer one.
  const latest = useRef(0);

  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      const call = (latest.current += 1);
      setState({ status: 'pending', error: null });
      try {
        const data = await fn(variables);
        // A stale call neither updates the state nor runs the side effect (seeding the session).
        if (call === latest.current) {
          onSuccess?.(data);
          setState({ status: 'success', data, error: null });
        }
        return data;
      } catch (e) {
        if (call === latest.current) setState({ status: 'error', error: e as TError });
        throw e;
      }
    },
    [fn, onSuccess],
  );

  const mutate = useCallback(
    (variables: TVariables) => {
      mutateAsync(variables).catch(() => undefined);
    },
    [mutateAsync],
  );

  return {
    mutate,
    mutateAsync,
    data: state.data,
    error: state.error,
    isIdle: state.status === 'idle',
    isPending: state.status === 'pending',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
  };
}
