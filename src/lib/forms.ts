import type { FieldPath, FieldValues, Resolver, UseFormSetError } from 'react-hook-form';
import type { ApiError } from '@/api/errors';

/** Maps ApiError.fieldErrors onto known form fields (PRD-UI §7); returns whether any matched. */
export function applyFieldErrors<T extends FieldValues>(
  error: ApiError,
  fields: readonly FieldPath<T>[],
  setError: UseFormSetError<T>,
): boolean {
  let matched = false;
  for (const field of fields) {
    const message = error.fieldErrors[field];
    if (message) {
      setError(field, { type: 'server', message });
      matched = true;
    }
  }
  return matched;
}

export interface LazyResolver<T extends FieldValues> extends Resolver<T> {
  /** Starts loading the validator early (e.g. on first focus) so submit does not wait. */
  preload: () => void;
}

/**
 * Wraps a resolver that is loaded on demand, keeping schema libraries out of a route's
 * initial JS. React Hook Form awaits async resolvers on submit.
 */
export function lazyResolver<T extends FieldValues>(load: () => Promise<Resolver<T>>): LazyResolver<T> {
  let loading: Promise<Resolver<T>> | undefined;
  const get = () => (loading ??= load());
  const resolver = (async (values, context, options) => (await get())(values, context, options)) as LazyResolver<T>;
  resolver.preload = () => {
    void get();
  };
  return resolver;
}
