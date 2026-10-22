import { Lock, Mail, User } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { ApiError } from '@/api/errors';
import TextField from '@/ui/TextField';
import AuthLayout from './AuthLayout';
import { authErrorMessage } from './errors';
import GoogleButton from './GoogleButton';
import { HOME, safeNext } from './guards';
import { useRedirectIfSignedIn } from './useRedirectIfSignedIn';
import { useSignUp } from './queries';
import type { SignUpValues } from './schemas';
import { useAuthForm } from './useAuthForm';

// New accounts start onboarding unless they arrived with a specific destination.
const NEW_ACCOUNT_HOME = '/start';

const FIELDS = ['name', 'email', 'password'] as const;
const loadValidator = () => import('./validation').then((m) => m.validateSignUp);

export default function SignUpPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const rawNext = params.get('next');
  const next = rawNext ? safeNext(rawNext) : NEW_ACCOUNT_HOME;
  const signUp = useSignUp();
  // Already signed in: go to next or Today. A fresh account goes to `next` or onboarding instead.
  useRedirectIfSignedIn(rawNext ? next : HOME, signUp.isIdle || signUp.isError);

  const form = useAuthForm<SignUpValues>(FIELDS, loadValidator);

  const onSubmit = form.handleSubmit(async ({ name, ...rest }) => {
    try {
      await signUp.mutateAsync(name ? { ...rest, name } : rest);
      await navigate(next, { replace: true });
    } catch (error) {
      form.applyServerErrors(error as ApiError);
    }
  });

  const formError = signUp.error && authErrorMessage(signUp.error, 'signup');
  const busy = form.submitting || signUp.isPending;
  const query = rawNext ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <AuthLayout title="Create your account" subtitle="Start a learning path grounded in the best free resources.">
      <form onSubmit={(e) => void onSubmit(e)} onFocus={form.preload} noValidate className="space-y-5">
        <TextField label="Name (optional)" icon={User} autoComplete="name" error={form.errors.name} {...form.field('name')} />
        <TextField
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          inputMode="email"
          error={form.errors.email}
          {...form.field('email')}
        />
        <TextField
          label="Password"
          icon={Lock}
          type="password"
          autoComplete="new-password"
          hint="At least 10 characters."
          error={form.errors.password}
          {...form.field('password')}
        />
        {formError && (
          <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
            {formError}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-3 text-base font-bold text-white shadow-lg transition-shadow hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-75"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-sm text-text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <GoogleButton next={next} />

      <p className="mt-6 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link to={`/signin${query}`} className="font-semibold text-primary underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
