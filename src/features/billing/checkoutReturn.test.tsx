import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockMe } from '@/api/mocks/data';
import { http } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import type { Me } from '@/api/types';
import { openedSockets } from '@/test/fakeSocket';
import { renderRoute } from '@/test/render';
import { resetToasts } from '@/ui/toast/store';
import { readCheckoutBaseline, saveCheckoutBaseline } from './checkoutBaseline';
import { ACTIVATION_POLL_MS, ACTIVATION_WINDOW_MS } from './components/CheckoutReturnNotice';

afterEach(() => {
  act(() => {
    resetToasts();
  });
  vi.useRealTimers();
  window.sessionStorage.clear();
});

const withCredits = (credits: number): Me => ({ ...mockMe, quota: { ...mockMe.quota, credits } });
const subscribed: Me = { ...mockMe, plan: 'subscription', quota: { ...mockMe.quota, monthlyPaths: 10 } };

/** auth/me answers `first` until the n-th read, then `after`; counts reads. */
function meSequence(first: Me, after: Me, changeOnRead: number) {
  const reads = { count: 0 };
  server.use(
    http.get('/v1/auth/me', ({ response }) => {
      reads.count += 1;
      return response(200).json(reads.count >= changeOnRead ? after : first);
    }),
  );
  return reads;
}

describe('/account?checkout=success (contract 0.6.0)', () => {
  it('credits that land mid-poll confirm with the number added, and polling stops', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    saveCheckoutBaseline(withCredits(0)); // saved when the checkout started
    const reads = meSequence(withCredits(0), withCredits(3), 3);
    const { router } = renderRoute('/account?checkout=success');
    expect(await screen.findByText('Payment received, activating…')).toBeInTheDocument();
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ACTIVATION_POLL_MS);
      });
    }
    expect(await screen.findByText('Payment confirmed: +3 credits.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your plan' })).toHaveTextContent('Free plan · 3 extra paths from credits');
    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(readCheckoutBaseline(mockMe.user.id)).toBeNull();
    const readsAtConfirm = reads.count;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ACTIVATION_POLL_MS * 5);
    });
    expect(reads.count).toBe(readsAtConfirm);
  });

  it('confirms at once when the webhook landed before the learner came back', async () => {
    saveCheckoutBaseline(withCredits(1));
    meSequence(withCredits(2), withCredits(2), 1);
    renderRoute('/account?checkout=success');
    expect(await screen.findByText('Payment confirmed: +1 credit.')).toBeInTheDocument();
  });

  it('a subscription confirms with the plan, also when it arrives as entitlement.changed', async () => {
    saveCheckoutBaseline(mockMe);
    renderRoute('/account?checkout=success');
    expect(await screen.findByText('Payment received, activating…')).toBeInTheDocument();
    await waitFor(() => {
      expect(openedSockets).toHaveLength(1);
    });
    act(() => {
      openedSockets[0]!.serverEmit('entitlement.changed', { plan: subscribed.plan, quota: subscribed.quota });
    });
    expect(await screen.findByText('Payment confirmed: your subscription is active.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your plan' })).toHaveTextContent('Subscription plan');
  });

  it('after 2 minutes without a change, says it is still processing and offers a manual check', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    saveCheckoutBaseline(withCredits(0));
    const reads = meSequence(withCredits(0), withCredits(0), Number.POSITIVE_INFINITY);
    renderRoute('/account?checkout=success');
    expect(await screen.findByText('Payment received, activating…')).toBeInTheDocument();
    for (let elapsed = 0; elapsed < ACTIVATION_WINDOW_MS; elapsed += ACTIVATION_POLL_MS) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ACTIVATION_POLL_MS);
      });
    }
    expect(await screen.findByText('Still processing. Refresh in a minute or check your email receipt.')).toBeInTheDocument();
    const readsAfterWindow = reads.count;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ACTIVATION_POLL_MS * 5);
    });
    expect(reads.count).toBe(readsAfterWindow); // polling has stopped
    vi.useRealTimers();
    await userEvent.click(screen.getByRole('button', { name: 'Check again' }));
    await waitFor(() => {
      expect(reads.count).toBe(readsAfterWindow + 1);
    });
  });

  it('stops polling when the learner leaves /account', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    saveCheckoutBaseline(withCredits(0));
    const reads = meSequence(withCredits(0), withCredits(0), Number.POSITIVE_INFINITY);
    const { router } = renderRoute('/account?checkout=success');
    expect(await screen.findByText('Payment received, activating…')).toBeInTheDocument();
    await act(async () => {
      await router.navigate('/progress');
    });
    const readsAfterLeaving = reads.count;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ACTIVATION_POLL_MS * 5);
    });
    expect(reads.count).toBe(readsAfterLeaving);
  });
});
