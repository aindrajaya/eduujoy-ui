import { describe, expect, it } from 'vitest';
import { mockMe } from '@/api/mocks/data';
import { planSummary, purchaseConfirmation } from './planSummary';

describe('planSummary', () => {
  it('names the plan and adds credits only when there are some, pluralised', () => {
    expect(planSummary('free', 0)).toBe('Free plan');
    expect(planSummary('free', 1)).toBe('Free plan · 1 extra path from credits');
    expect(planSummary('subscription', 4)).toBe('Subscription plan · 4 extra paths from credits');
  });
});

describe('purchaseConfirmation', () => {
  const me = (plan: 'free' | 'subscription', credits: number) => ({ ...mockMe, plan, quota: { ...mockMe.quota, credits } });
  it('says what changed, or nothing yet', () => {
    expect(purchaseConfirmation({ plan: 'free', credits: 0 }, me('free', 0))).toBeNull();
    expect(purchaseConfirmation({ plan: 'free', credits: 0 }, me('free', 1))).toBe('Payment confirmed: +1 credit.');
    expect(purchaseConfirmation({ plan: 'free', credits: 2 }, me('free', 7))).toBe('Payment confirmed: +5 credits.');
    expect(purchaseConfirmation({ plan: 'free', credits: 0 }, me('subscription', 0))).toBe(
      'Payment confirmed: your subscription is active.',
    );
  });
});
