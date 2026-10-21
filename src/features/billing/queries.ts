import { useMutation } from '@tanstack/react-query';
import { createCheckout } from '@/api/endpoints/billing';
import { ApiError } from '@/api/errors';
import type { CheckoutRequest } from '@/api/types';

export type CheckoutProduct = CheckoutRequest['product'];

const invalidLink = () => new ApiError({ status: 0, code: 'INTERNAL', title: 'Invalid checkout link' });

/** Only an https link leaves the app; anything else is treated as a failed checkout. */
export function checkoutUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw invalidLink();
  }
  if (url.protocol !== 'https:') throw invalidLink();
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
