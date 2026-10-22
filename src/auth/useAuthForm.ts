import { useCallback, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react';
import type { ApiError } from '@/api/errors';
import type { FieldErrors, Validation } from './validation';

type Validator<T> = (raw: Record<string, string>) => Validation<T>;

/**
 * The sign-in and sign-up forms without a form library (perf/entry-headroom: React Hook Form cost
 * 11.5 KB of /signin's initial JS). Same behaviour: validate on submit, then re-validate as the
 * learner types; the schema loads on demand (preloaded on first focus); focus moves to the first
 * invalid field; server field errors land on their fields.
 */
export function useAuthForm<T>(fields: readonly (keyof T & string)[], load: () => Promise<Validator<T>>) {
  const loading = useRef<Promise<Validator<T>> | null>(null);
  const [errors, setErrors] = useState<FieldErrors<T>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validator = useCallback(() => (loading.current ??= load()), [load]);

  const read = (form: HTMLFormElement) => {
    const data = new FormData(form);
    // Text inputs only, so every entry is a string; a missing field reads as empty.
    return Object.fromEntries(
      fields.map((f) => {
        const value = data.get(f);
        return [f, typeof value === 'string' ? value : ''];
      }),
    ) as Record<string, string>;
  };

  /** After the first submit, keeps the messages in step with what is typed. */
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const form = e.currentTarget.form;
    if (!submitted || !form) return;
    void validator().then((validate) => {
      const result = validate(read(form));
      setErrors(result.ok ? {} : result.errors);
    });
  };

  const handleSubmit = (submit: (values: T) => Promise<void>) => async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitted(true);
    setSubmitting(true);
    try {
      const result = (await validator())(read(form));
      if (!result.ok) {
        setErrors(result.errors);
        const first = fields.find((f) => result.errors[f]);
        const input = first ? form.elements.namedItem(first) : null;
        if (input instanceof HTMLInputElement) input.focus();
        return;
      }
      setErrors({});
      await submit(result.values);
    } finally {
      setSubmitting(false);
    }
  };

  /** Maps ApiError.fieldErrors onto the form (PRD-UI §7). */
  const applyServerErrors = (error: ApiError) => {
    const matched: FieldErrors<T> = {};
    for (const field of fields) {
      const message = error.fieldErrors[field];
      if (message) matched[field] = message;
    }
    if (Object.keys(matched).length) setErrors(matched);
  };

  return {
    errors,
    submitting,
    preload: () => {
      void validator();
    },
    field: (name: keyof T & string) => ({ name, onChange }),
    handleSubmit,
    applyServerErrors,
  };
}
