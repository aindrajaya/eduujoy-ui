import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockMe } from '@/api/mocks/data';
import { http } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { openedSockets } from '@/test/fakeSocket';
import { renderRoute } from '@/test/render';
import { resetToasts } from '@/ui/toast/store';
import { ACTIVATION_POLL_MS } from './components/CheckoutReturnNotice';

afterEach(() => {
  act(() => {
    resetToasts();
  });
  vi.useRealTimers();
});

const subscribed = { ...mockMe, plan: 'subscription' as const, quota: { ...mockMe.quota, monthlyPaths: 10 } };

describe('/account?checkout=success (contract 0.6.0)', () => {
  it('says the payment is activating until entitlement.changed arrives, then confirms', async () => {
    const { router } = renderRoute('/account?checkout=success');
    expect(await screen.findByText('Payment received, activating…')).toBeInTheDocument();
    await waitFor(() => {
      expect(openedSockets).toHaveLength(1);
    });
    act(() => {
      openedSockets[0]!.serverEmit('entitlement.changed', { plan: subscribed.plan, quota: subscribed.quota });
    });
    expect(await screen.findByText('Payment confirmed. Your plan is updated.')).toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
  });

  it('without the event, re-reads auth/me until the plan changes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let meCalls = 0;
    server.use(
      http.get('/v1/auth/me', ({ response }) => {
        meCalls += 1;
        // The webhook lands between the first and the second read.
        return response(200).json(meCalls === 1 ? mockMe : subscribed);
      }),
    );
    renderRoute('/account?checkout=success');
    expect(await screen.findByText('Payment received, activating…')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ACTIVATION_POLL_MS);
    });
    expect(await screen.findByText('Payment confirmed. Your plan is updated.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your plan' })).toHaveTextContent('Subscription');
  });
});
