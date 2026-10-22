import type { Me } from '@/api/types';

/** One line for plan and credits: "Free plan · 1 extra path from credits" (no credit clause at 0). */
export function planSummary(plan: Me['plan'], credits: number): string {
  const name = plan === 'subscription' ? 'Subscription plan' : 'Free plan';
  if (credits <= 0) return name;
  return `${name} · ${String(credits)} extra ${credits === 1 ? 'path' : 'paths'} from credits`;
}

/** What a confirmed purchase changed, for the return notice; null while nothing has changed. */
export function purchaseConfirmation(before: { plan: Me['plan']; credits: number }, now: Me): string | null {
  if (before.plan !== 'subscription' && now.plan === 'subscription') {
    return 'Payment confirmed: your subscription is active.';
  }
  const added = now.quota.credits - before.credits;
  if (added > 0) return `Payment confirmed: +${String(added)} ${added === 1 ? 'credit' : 'credits'}.`;
  return null;
}
