import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { SignInLocationState } from '@/auth/queries';
import { useSignOut } from '@/auth/signOut';
import { hasRole, useSession } from '@/auth/session';
import CheckoutReturnNotice from '@/features/billing/components/CheckoutReturnNotice';
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
  // Remembered on arrival, so the confirmation stays after ?checkout=success is dropped.
  const [checkoutReturn] = useState(() => params.get('checkout') === 'success');

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
          className="mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-ink bg-surface font-display text-3xl text-text shadow-lg md:h-24 md:w-24 md:text-4xl"
          aria-hidden="true"
        >
          {initials(name)}
        </div>
        <h1 className="text-2xl text-text md:text-3xl">{name}</h1>
        <p className="text-base text-text-muted">{me?.user.email}</p>
      </header>

      {me && checkoutReturn && (
        <CheckoutReturnNotice
          me={me}
          onActivated={() => {
            setParams({}, { replace: true });
          }}
        />
      )}
      {me && <PlanCard me={me} />}

      {hasRole(me, ['reviewer', 'admin']) && (
        <nav aria-label="Staff" className="sk-card flex flex-col gap-2">
          <Link to="/admin/review" className="inline-flex min-h-11 items-center font-semibold text-primary underline">
            Review queue
          </Link>
          {hasRole(me, ['admin']) && (
            <Link to="/admin/metrics" className="inline-flex min-h-11 items-center font-semibold text-primary underline">
              Costs and latency
            </Link>
          )}
        </nav>
      )}

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
        className="sk-btn w-full"
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
        {signOut.isPending ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
