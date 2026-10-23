import { useLocation } from 'react-router';
import Notice from '@/ui/Notice';
import type { SignInLocationState } from './queries';
import { useSignOut } from './signOut';

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
      <Notice tone="success" role="status" className="mb-4">
        You are signed out.
      </Notice>
    );
  }

  return (
    <Notice tone="warning" role="alert" className="mb-4">
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
    </Notice>
  );
}
