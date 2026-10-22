// Loaded on demand by the auth forms (useAuthForm), so Zod is not in the sign-in first load.
import { signInSchema, signUpSchema, type SignInValues, type SignUpValues } from './schemas';

export type FieldErrors<T> = Partial<Record<keyof T & string, string>>;

export type Validation<T> = { ok: true; values: T } | { ok: false; errors: FieldErrors<T> };

/** Runs a schema over raw form values; the first message per field wins. */
function run<T>(schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } } }, raw: Record<string, string>): Validation<T> {
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, values: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in errors)) errors[field] = issue.message;
  }
  return { ok: false, errors: errors as FieldErrors<T> };
}

export const validateSignIn = (raw: Record<string, string>) => run<SignInValues>(signInSchema, raw);
export const validateSignUp = (raw: Record<string, string>) => run<SignUpValues>(signUpSchema, raw);
