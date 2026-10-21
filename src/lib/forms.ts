import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
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
