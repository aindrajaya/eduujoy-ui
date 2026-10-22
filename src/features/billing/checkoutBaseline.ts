import type { Me } from '@/api/types';

// What the learner had when a checkout started, so the return to /account can tell when the
// purchase has landed (even if the webhook beat the redirect back). sessionStorage, per user and
// per tab; plan and credit counts only, no session data. Its own module, not lib/storage.ts:
// that one is in /signin's initial JS (budget).

export interface CheckoutBaseline {
  plan: Me['plan'];
  credits: number;
  at: number;
}

const MAX_AGE_MS = 60 * 60_000;
const key = (userId: string) => `checkout:${userId}`;

function store(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveCheckoutBaseline(me: Me, now = Date.now()): void {
  const baseline: CheckoutBaseline = { plan: me.plan, credits: me.quota.credits, at: now };
  try {
    store()?.setItem(key(me.user.id), JSON.stringify(baseline));
  } catch {
    // Storage full or blocked: the return falls back to what /account sees on arrival.
  }
}

export function readCheckoutBaseline(userId: string, now = Date.now()): CheckoutBaseline | null {
  try {
    const raw = store()?.getItem(key(userId));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<CheckoutBaseline>;
    const valid =
      (value.plan === 'free' || value.plan === 'subscription') &&
      typeof value.credits === 'number' &&
      typeof value.at === 'number' &&
      now - value.at <= MAX_AGE_MS;
    return valid ? (value as CheckoutBaseline) : null;
  } catch {
    return null;
  }
}

export function clearCheckoutBaseline(userId: string): void {
  try {
    store()?.removeItem(key(userId));
  } catch {
    // Nothing to clear.
  }
}
