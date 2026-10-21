import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useSignOut, type SignInLocationState } from '@/auth/queries';
import { useSession } from '@/auth/session';
import { demoProfile } from '@/fixtures/demo';
import Profile from './components/Profile';

// The user comes from auth/me; the learning profile stays static until U10.
export default function AccountPage() {
  const { data: me } = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();

  const user = {
    name: me?.user.name ?? me?.user.email.split('@')[0] ?? '',
    email: me?.user.email ?? '',
  };

  const handleSignOut = () => {
    signOut.mutate(undefined, {
      onSettled: (_data, error) => {
        const state: SignInLocationState = { signOutFailed: Boolean(error) };
        void navigate('/signin', { replace: true, state });
      },
    });
  };

  return (
    <>
      <Profile profile={demoProfile} user={user} />
      <div className="px-4 pb-6 md:px-6">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signOut.isPending}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-border bg-surface px-4 py-3 font-semibold text-danger transition-colors hover:border-danger disabled:opacity-60"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          {signOut.isPending ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </>
  );
}
