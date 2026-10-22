import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockMe, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import type { CheckoutRequest, Me } from '@/api/types';
import { expectNoAxeViolations } from '@/test/axe';
import { createTestQueryClient, withQueryClient } from '@/test/providers';
import { checkoutUrl } from '../queries';
import PlanCard from './PlanCard';

function renderPlan(me: Me = mockMe) {
  const onCheckoutUrl = vi.fn();
  const Wrapper = withQueryClient(createTestQueryClient());
  const utils = render(
    <Wrapper>
      <PlanCard me={me} onCheckoutUrl={onCheckoutUrl} />
    </Wrapper>,
  );
  return { onCheckoutUrl, ...utils };
}

describe('PlanCard (FR-23)', () => {
  it('shows the free plan, paths left and credits, and upgrades through Lemon Squeezy', async () => {
    let body: CheckoutRequest | undefined;
    server.use(
      http.post('/v1/billing/checkout', async ({ request, response }) => {
        body = await request.json();
        return response(200).json({ url: 'https://eduujoy.lemonsqueezy.com/checkout/abc' });
      }),
    );
    const { onCheckoutUrl, container } = renderPlan();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Paths left this month').nextElementSibling).toHaveTextContent('1 of 1');
    expect(screen.getByText(/reset on 21 November/)).toBeInTheDocument();
    await expectNoAxeViolations(container);

    await userEvent.click(screen.getByRole('button', { name: 'Upgrade to subscription' }));
    await waitFor(() => {
      expect(onCheckoutUrl).toHaveBeenCalledWith('https://eduujoy.lemonsqueezy.com/checkout/abc');
    });
    expect(body).toEqual({ product: 'subscription' });
  });

  it('subscribers only see the credit pack', async () => {
    let body: CheckoutRequest | undefined;
    server.use(
      http.post('/v1/billing/checkout', async ({ request, response }) => {
        body = await request.json();
        return response(200).json({ url: 'https://eduujoy.lemonsqueezy.com/checkout/pack' });
      }),
    );
    renderPlan({ ...mockMe, plan: 'subscription', quota: { ...mockMe.quota, monthlyPaths: 10, usedPaths: 3, credits: 2 } });
    expect(screen.getByText('Subscription')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upgrade to subscription' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Buy a credit pack' }));
    await waitFor(() => {
      expect(body).toEqual({ product: 'credit_pack' });
    });
  });

  it('never leaves for a non-https link, and says nothing was charged when checkout fails', async () => {
    server.use(http.post('/v1/billing/checkout', ({ response }) => response(200).json({ url: 'javascript:alert(1)' })));
    const { onCheckoutUrl } = renderPlan();
    await userEvent.click(screen.getByRole('button', { name: 'Buy a credit pack' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not open the checkout. Nothing was charged');
    expect(onCheckoutUrl).not.toHaveBeenCalled();

    server.use(
      http.post('/v1/billing/checkout', ({ response }) =>
        response.untyped(problemResponse(mockProblem(400, 'VALIDATION_FAILED', 'Bad product'))),
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Buy a credit pack' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nothing was charged');
  });

  it('checkoutUrl accepts https Lemon Squeezy links only', () => {
    expect(checkoutUrl('https://x.lemonsqueezy.com/c')).toBe('https://x.lemonsqueezy.com/c');
    expect(checkoutUrl('https://lemonsqueezy.com/c')).toBe('https://lemonsqueezy.com/c');
    for (const bad of [
      'http://x.lemonsqueezy.com/c',
      'https://evil.example/c',
      'https://lemonsqueezy.com.evil.example/c',
      'https://evillemonsqueezy.com/c',
      'not a url',
    ]) {
      expect(() => checkoutUrl(bad)).toThrow();
    }
  });

  it('a foreign https host counts as a failed checkout and is never followed', async () => {
    server.use(http.post('/v1/billing/checkout', ({ response }) => response(200).json({ url: 'https://evil.example/checkout' })));
    const { onCheckoutUrl } = renderPlan();
    await userEvent.click(screen.getByRole('button', { name: 'Buy a credit pack' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not open the checkout. Nothing was charged');
    expect(onCheckoutUrl).not.toHaveBeenCalled();
  });
});
