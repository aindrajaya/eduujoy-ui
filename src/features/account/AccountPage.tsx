import { LogOut } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { useSignOut, type SignInLocationState } from '@/auth/queries';
import { useSession } from '@/auth/session';
import PlanCard from '@/features/billing/components/PlanCard';
import DataSection from './components/DataSection';

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return letters || '?';
}

/** FR-23: who is signed in, the plan with checkout, and sign-out (PRD-UI §3). */
export default function AccountPage() {
  const { data: me } = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const name = me?.user.name ?? me?.user.email.split('@')[0] ?? '';

  const handleSignOut = () => {
    signOut.mutate(undefined, {
      onSettled: (_data, error) => {
        const state: SignInLocationState = { signOutFailed: Boolean(error) };
        void navigate('/signin', { replace: true, state });
      },
    });
  };

  return (
    <div className="animate-fade-in space-y-6 p-4 md:p-6">
      <header className="flex flex-col items-center">
        <div
          className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white shadow-lg md:h-24 md:w-24 md:text-4xl"
          aria-hidden="true"
        >
          {initials(name)}
        </div>
        <h1 className="text-xl font-bold text-text md:text-2xl">{name}</h1>
        <p className="text-base text-text-muted">{me?.user.email}</p>
      </header>

      {me && <PlanCard me={me} />}

      <DataSection
        confirmDelete={params.get('delete') === '1'}
        onDeleteClosed={() => {
          if (params.has('delete')) setParams({}, { replace: true });
        }}
      />

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
  );
}
