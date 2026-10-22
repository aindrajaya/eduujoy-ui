import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { Me } from '@/api/types';
import { sessionKeys } from '@/auth/session';

/** How often, and how many times, auth/me is re-read while waiting for the plan to change. */
export const ACTIVATION_POLL_MS = 5000;
export const ACTIVATION_POLLS = 12;

const entitlement = (me: Me) => `${me.plan}:${me.quota.credits}:${me.quota.monthlyPaths}`;

export interface CheckoutReturnNoticeProps {
  me: Me;
  /** The change arrived; the page drops `?checkout=success`. */
  onActivated: () => void;
}

/**
 * Contract 0.6.0: Lemon Squeezy returns to /account?checkout=success. That is a hint only; the
 * purchase counts once the webhook has run, which arrives as entitlement.changed (it updates the
 * session cache) or shows up when auth/me is read again. Until then: "activating".
 */
export default function CheckoutReturnNotice({ me, onActivated }: CheckoutReturnNoticeProps) {
  const client = useQueryClient();
  // What the learner had when they came back; the purchase shows as a change from it.
  const [before] = useState(() => entitlement(me));
  const [polls, setPolls] = useState(0);
  const activated = entitlement(me) !== before;
  // Tell the page once; onActivated changes the URL, and a new callback must not fire it again.
  const notified = useRef(false);

  useEffect(() => {
    if (activated) {
      if (!notified.current) {
        notified.current = true;
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
  }, [activated, client, onActivated, polls]);

  return (
    <p role="status" className="rounded-card bg-primary-soft p-3 text-sm text-text">
      {activated
        ? 'Payment confirmed. Your plan is updated.'
        : polls >= ACTIVATION_POLLS
          ? 'Payment received. Activation is taking longer than usual; this page updates when it is done.'
          : 'Payment received, activating…'}
    </p>
  );
}
