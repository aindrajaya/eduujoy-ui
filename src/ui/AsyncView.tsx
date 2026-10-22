import type { ReactNode } from 'react';
import type { ApiError } from '@/api/errors';
import { errorCopy } from '@/lib/error-copy';
import StateMessage from './StateMessage';

/** The parts of a TanStack Query result that AsyncView reads. */
export interface AsyncQuery<T> {
  data: T | undefined;
  error: ApiError | null;
  isPending: boolean;
  isRefetching: boolean;
  refetch: () => unknown;
}

export interface AsyncViewProps<T> {
  query: AsyncQuery<T>;
  /** What is loading, for screen readers ("your path"). */
  label: string;
  skeleton: ReactNode;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}

/**
 * Renders the four states every screen needs (loading, error, empty, success) for one query.
 * Loading shows a layout-matched skeleton; error offers a retry.
 */
export default function AsyncView<T>({ query, label, skeleton, isEmpty, empty, children }: AsyncViewProps<T>) {
  if (query.isPending) {
    return (
      <div role="status" aria-busy="true" aria-label={`Loading ${label}`}>
        {skeleton}
      </div>
    );
  }
  if (query.error || query.data === undefined) {
    return (
      <StateMessage
        tone="danger"
        title={`Could not load ${label}`}
        action={
          <button
            type="button"
            disabled={query.isRefetching}
            onClick={() => void query.refetch()}
            className="min-h-11 rounded-xl bg-primary px-5 font-semibold text-on-primary disabled:opacity-60"
          >
            {query.isRefetching ? 'Retrying…' : 'Try again'}
          </button>
        }
      >
        {query.error ? errorCopy(query.error) : null}
      </StateMessage>
    );
  }
  if (isEmpty?.(query.data)) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
