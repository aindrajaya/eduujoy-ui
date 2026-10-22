import type { Me } from '@/api/types';
import { useCheckout, type CheckoutProduct } from '../queries';

// Billing periods end at a UTC instant; show that day, not the viewer's local one.
const periodDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(iso));

export interface PlanCardProps {
  me: Me;
  /** Tests replace the redirect to Lemon Squeezy. */
  onCheckoutUrl?: (url: string) => void;
}

/** FR-23: plan, this month's paths and credits, and the way to upgrade or top up. */
export default function PlanCard({ me, onCheckoutUrl }: PlanCardProps) {
  const checkout = useCheckout(onCheckoutUrl);
  const { plan, quota } = me;
  const pending = (product: CheckoutProduct) => checkout.isPending && checkout.variables === product;
  const left = Math.max(0, quota.monthlyPaths - quota.usedPaths);

  return (
    <section aria-labelledby="plan-title" className="space-y-4 rounded-card border border-border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="plan-title" className="text-lg font-bold text-text">
          Your plan
        </h2>
        <span className="rounded-chip bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
          {plan === 'subscription' ? 'Subscription' : 'Free'}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-surface-muted p-3">
          <dt className="text-text-muted">Paths left this month</dt>
          <dd className="text-xl font-bold text-text">
            {left} <span className="text-sm font-normal text-text-muted">of {quota.monthlyPaths}</span>
          </dd>
        </div>
        <div className="rounded-lg bg-surface-muted p-3">
          <dt className="text-text-muted">Credits</dt>
          <dd className="text-xl font-bold text-text">{quota.credits}</dd>
        </div>
      </dl>
      <p className="text-sm text-text-muted">Your monthly paths reset on {periodDate(quota.periodEnd)}.</p>

      <div className="flex flex-col gap-2 sm:flex-row">
        {plan === 'free' && (
          <button
            type="button"
            onClick={() => {
              checkout.mutate('subscription');
            }}
            disabled={checkout.isPending}
            className="min-h-11 flex-1 rounded-xl bg-primary px-5 font-semibold text-on-primary disabled:opacity-60"
          >
            {pending('subscription') ? 'Opening checkout…' : 'Upgrade to subscription'}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            checkout.mutate('credit_pack');
          }}
          disabled={checkout.isPending}
          className="min-h-11 flex-1 rounded-xl border-2 border-primary px-5 font-semibold text-primary disabled:opacity-60"
        >
          {pending('credit_pack') ? 'Opening checkout…' : 'Buy a credit pack'}
        </button>
      </div>
      <p className="text-xs text-text-muted">Payments are handled by Lemon Squeezy. You will leave Eduujoy to pay.</p>
      {checkout.error && (
        <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {checkout.error.status === 0 && checkout.error.code !== 'INTERNAL'
            ? 'We could not reach the server. Check your connection and try again. Nothing was charged.'
            : 'We could not open the checkout. Nothing was charged; please try again.'}
        </p>
      )}
    </section>
  );
}
