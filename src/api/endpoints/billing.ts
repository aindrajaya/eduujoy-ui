import { api } from '../client';
import type { CheckoutRequest, CheckoutResponse } from '../types';

export async function createCheckout(body: CheckoutRequest): Promise<CheckoutResponse> {
  const { data } = await api.post<CheckoutResponse>('/v1/billing/checkout', body);
  return data;
}
