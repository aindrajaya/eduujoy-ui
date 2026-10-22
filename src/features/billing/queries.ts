import { useMutation } from '@tanstack/react-query';
import { createCheckout } from '@/api/endpoints/billing';
import { ApiError } from '@/api/errors';
import type { CheckoutRequest } from '@/api/types';

export type CheckoutProduct = CheckoutRequest['product'];

const invalidLink = () => new ApiError({ status: 0, code: 'INTERNAL', title: 'Invalid checkout link' });

const CHECKOUT_HOST = 'lemonsqueezy.com';

/**
 * Only a Lemon Squeezy https link leaves the app (lemonsqueezy.com or a subdomain of it); anything
 * else is treated as a failed checkout, so a bad API response can never send the learner elsewhere.
 */
export function checkoutUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw invalidLink();
  }
  const host = url.hostname.toLowerCase();
  const lemonSqueezy = host === CHECKOUT_HOST || host.endsWith(`.${CHECKOUT_HOST}`);
  if (url.protocol !== 'https:' || !lemonSqueezy) throw invalidLink();
  return url.href;
}

/**
 * FR-23: asks the API for a Lemon Squeezy checkout link and leaves for it. The plan changes
 * server-side from the webhook and reaches the app as `entitlement.changed` (realtime socket).
 */
const leaveFor = (url: string) => {
  window.location.assign(url);
};

export function useCheckout(go: (url: string) => void = leaveFor) {
  return useMutation<string, ApiError, CheckoutProduct>({
    mutationFn: async (product) => checkoutUrl((await createCheckout({ product })).url),
    onSuccess: (url) => {
      go(url);
    },
  });
}
