import { useLocation } from 'react-router';
import { useSignOut, type SignInLocationState } from './queries';

/**
 * Shown on /signin when logout never reached the server (after its retries). The local cache is
 * already cleared, but the API session may still be live on this device, so offer a retry.
 */
export default function SignOutFailedNotice() {
  const state = useLocation().state as SignInLocationState | null;
  const signOut = useSignOut();

  if (!state?.signOutFailed) return null;

  if (signOut.isSuccess) {
    return (
      <p role="status" className="mb-4 rounded-lg bg-success-soft p-3 text-sm text-success">
        You are signed out.
      </p>
    );
  }

  return (
    <div role="alert" className="mb-4 rounded-lg bg-warning-soft p-3 text-sm text-warning">
      <p>We couldn&apos;t reach the server. You may still be signed in on this device.</p>
      <button
        type="button"
        disabled={signOut.isPending}
        onClick={() => {
          signOut.mutate();
        }}
        className="mt-2 min-h-11 font-semibold underline disabled:opacity-60"
      >
        {signOut.isPending ? 'Signing out…' : 'Try signing out again'}
      </button>
    </div>
  );
}
