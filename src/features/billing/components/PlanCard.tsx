import type { ApiError } from '@/api/errors';
import type { Me } from '@/api/types';
import { formatRetryWait } from '@/lib/time';
import { useId, useState } from 'react';
import { MAX_CREDIT_PACKS, useCheckout, type CheckoutProduct } from '../queries';

// Billing periods end at a UTC instant; show that day, not the viewer's local one.
function checkoutErrorCopy(error: ApiError): string {
  // Contract 0.6.0: a second subscription while one is active.
  if (error.code === 'CONFLICT') return 'You already have an active subscription. Nothing was charged.';
  // Contract 0.6.0: the payment provider is down (Retry-After).
  if (error.code === 'SERVICE_UNAVAILABLE') {
    const when = error.retryAfterMs !== undefined ? formatRetryWait(error.retryAfterMs) : 'in a few minutes';
    return `Checkout is briefly unavailable. Try again ${when}. Nothing was charged.`;
  }
  if (error.status === 0 && error.code !== 'INTERNAL') {
    return 'We could not reach the server. Check your connection and try again. Nothing was charged.';
  }
  return 'We could not open the checkout. Nothing was charged; please try again.';
}

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
  const pending = (product: CheckoutProduct) => checkout.isPending && checkout.variables.product === product;
  const [packs, setPacks] = useState(1);
  const packsId = useId();
  const packsErrorId = useId();
  // Contract 0.7.0: a 400 on quantity is a field error on the picker.
  const packsError = checkout.error?.status === 400 ? checkout.error.fieldErrors.quantity : undefined;
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
              checkout.mutate({ product: 'subscription' });
            }}
            disabled={checkout.isPending}
            className="min-h-11 flex-1 rounded-xl bg-primary px-5 font-semibold text-on-primary disabled:opacity-60"
          >
            {pending('subscription') ? 'Opening checkout…' : 'Upgrade to subscription'}
          </button>
        )}
        <div className="flex flex-1 items-stretch gap-2">
          <div className="flex flex-col">
            <label htmlFor={packsId} className="sr-only">
              Credit packs
            </label>
            <select
              id={packsId}
              value={packs}
              onChange={(e) => {
                setPacks(Number(e.target.value));
              }}
              aria-invalid={packsError ? true : undefined}
              aria-describedby={packsError ? packsErrorId : undefined}
              className="min-h-11 rounded-xl border-2 border-border bg-surface px-3 font-semibold text-text"
            >
              {Array.from({ length: MAX_CREDIT_PACKS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'pack' : 'packs'}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              checkout.mutate({ product: 'credit_pack', quantity: packs });
            }}
            disabled={checkout.isPending}
            className="min-h-11 flex-1 rounded-xl border-2 border-primary px-5 font-semibold text-primary disabled:opacity-60"
          >
            {pending('credit_pack') ? 'Opening checkout…' : packs === 1 ? 'Buy a credit pack' : `Buy ${packs} credit packs`}
          </button>
        </div>
      </div>
      {packsError && (
        <p id={packsErrorId} className="text-sm text-danger">
          {packsError}
        </p>
      )}
      <p className="text-xs text-text-muted">Payments are handled by Lemon Squeezy. You will leave Eduujoy to pay.</p>
      {checkout.error && !packsError && (
        <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {checkoutErrorCopy(checkout.error)}
        </p>
      )}
    </section>
  );
}
