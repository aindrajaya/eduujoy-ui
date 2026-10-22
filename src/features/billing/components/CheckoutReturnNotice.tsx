import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { Me } from '@/api/types';
import { sessionKeys } from '@/auth/session';
import { clearCheckoutBaseline, readCheckoutBaseline } from '../checkoutBaseline';
import { purchaseConfirmation } from '../planSummary';

/** How often, and for how long, auth/me is re-read while waiting for the purchase to land. */
export const ACTIVATION_POLL_MS = 3000;
export const ACTIVATION_WINDOW_MS = 2 * 60_000;
const ACTIVATION_POLLS = Math.ceil(ACTIVATION_WINDOW_MS / ACTIVATION_POLL_MS);

export interface CheckoutReturnNoticeProps {
  me: Me;
  /** The change arrived; the page drops `?checkout=success`. */
  onActivated: () => void;
}

/**
 * Contract 0.6.0: Lemon Squeezy returns to /account?checkout=success. That is a hint only; the
 * purchase counts once the webhook has run, which arrives as entitlement.changed (it updates the
 * session cache) or shows up when auth/me is read again. The comparison is with what the learner
 * had when the checkout started (saved then), so a webhook that beat the redirect back still
 * confirms. Polling stops when the change arrives or the learner leaves /account (unmount).
 */
export default function CheckoutReturnNotice({ me, onActivated }: CheckoutReturnNoticeProps) {
  const client = useQueryClient();
  // Before the checkout if it was saved; otherwise what the learner had on arrival.
  const [before] = useState(
    () => readCheckoutBaseline(me.user.id) ?? { plan: me.plan, credits: me.quota.credits },
  );
  const [polls, setPolls] = useState(0);
  const confirmation = purchaseConfirmation(before, me);
  // Tell the page once; onActivated changes the URL, and a new callback must not fire it again.
  const notified = useRef(false);

  useEffect(() => {
    if (confirmation) {
      if (!notified.current) {
        notified.current = true;
        clearCheckoutBaseline(me.user.id);
        onActivated();
      }
      return;
    }
    if (polls >= ACTIVATION_POLLS) return;
    const timer = setTimeout(() => {
      void client.invalidateQueries({ queryKey: sessionKeys.me() });
      setPolls((n) => n + 1);
    }, ACTIVATION_POLL_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [client, confirmation, me.user.id, onActivated, polls]);

  if (confirmation) {
    return (
      <p role="status" className="rounded-card bg-success-soft p-3 text-sm text-text">
        {confirmation}
      </p>
    );
  }

  if (polls >= ACTIVATION_POLLS) {
    return (
      <div role="status" className="space-y-2 rounded-card bg-primary-soft p-3 text-sm text-text">
        <p>Still processing. Refresh in a minute or check your email receipt.</p>
        <button
          type="button"
          onClick={() => {
            void client.invalidateQueries({ queryKey: sessionKeys.me() });
          }}
          className="inline-flex min-h-11 items-center font-semibold text-primary underline"
        >
          Check again
        </button>
      </div>
    );
  }

  return (
    <p role="status" className="rounded-card bg-primary-soft p-3 text-sm text-text">
      Payment received, activating…
    </p>
  );
}
