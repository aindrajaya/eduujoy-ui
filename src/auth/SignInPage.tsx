import { Lock, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import type { ApiError } from '@/api/errors';
import TextField from '@/ui/TextField';
import AuthLayout from './AuthLayout';
import { authErrorMessage } from './errors';
import GoogleButton from './GoogleButton';
import SignOutFailedNotice from './SignOutFailedNotice';
import { safeNext } from './guards';
import { useRedirectIfSignedIn } from './useRedirectIfSignedIn';
import { useSignIn, type SignInLocationState } from './queries';
import type { SignInValues } from './schemas';
import { useAuthForm } from './useAuthForm';

const FIELDS = ['email', 'password'] as const;
const loadValidator = () => import('./validation').then((m) => m.validateSignIn);

export default function SignInPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next'));
  const expired = params.get('expired') === '1';
  // Contract 0.6.0: a sensitive action (account delete) needs a fresh sign-in, so a signed-in
  // learner sent here with reauth=1 stays on the form instead of being redirected.
  const reauth = params.get('reauth') === '1';
  const accountDeleted = (useLocation().state as SignInLocationState | null)?.accountDeleted === true;
  const signIn = useSignIn();
  useRedirectIfSignedIn(next, !reauth && (signIn.isIdle || signIn.isError));

  const form = useAuthForm<SignInValues>(FIELDS, loadValidator);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signIn.mutateAsync(values);
      await navigate(next, { replace: true });
    } catch (error) {
      form.applyServerErrors(error as ApiError);
    }
  });

  const formError = signIn.error && authErrorMessage(signIn.error, 'signin');
  const busy = form.submitting || signIn.isPending;
  const query = params.get('next') ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue your learning path.">
      <SignOutFailedNotice />
      {accountDeleted && (
        <p role="status" className="mb-4 rounded-lg bg-success-soft p-3 text-sm text-success">
          Your account and personal data have been deleted.
        </p>
      )}
      {reauth && (
        <p role="status" className="mb-4 rounded-lg bg-warning-soft p-3 text-sm text-warning">
          For your security, sign in again to delete your account.
        </p>
      )}
      {expired && (
        <p role="status" className="mb-4 rounded-lg bg-warning-soft p-3 text-sm text-warning">
          Your session expired. Sign in again to continue.
        </p>
      )}
      <form onSubmit={(e) => void onSubmit(e)} onFocus={form.preload} noValidate className="space-y-5">
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
          autoComplete="current-password"
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
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-sm text-text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <GoogleButton next={next} reauth={reauth} />

      <p className="mt-6 text-center text-sm text-text-muted">
        New to Eduujoy?{' '}
        <Link to={`/signup${query}`} className="font-semibold text-primary underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
