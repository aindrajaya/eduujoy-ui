import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { mockMe, mockProblem, mockReviewItems } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import type { ReviewResolveRequest, Role } from '@/api/types';
import { expectNoAxeViolations } from '@/test/axe';
import { mockSignedOut, renderRoute } from '@/test/render';
import { resetToasts } from '@/ui/toast/store';

afterEach(() => {
  act(() => {
    resetToasts();
  });
});

const signInAs = (...roles: Role[]) => {
  server.use(http.get('/v1/auth/me', ({ response }) => response(200).json({ ...mockMe, roles })));
};

describe('admin access (U11)', () => {
  it('a signed-out visitor is sent to sign in, then back', async () => {
    mockSignedOut();
    const { router } = renderRoute('/admin/review');
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/signin');
    });
    expect(router.state.location.search).toBe('?next=%2Fadmin%2Freview');
  });

  it('a learner gets "No access" for the review queue and the metrics', async () => {
    signInAs('learner');
    const { unmount } = renderRoute('/admin/review');
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument();
    unmount();
    renderRoute('/admin/metrics');
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument();
  });

  it('a reviewer opens the queue but not the metrics; /admin goes to the queue', async () => {
    signInAs('learner', 'reviewer');
    const { router, unmount } = renderRoute('/admin');
    expect(await screen.findByRole('heading', { level: 1, name: 'Review queue' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/review');
    expect(screen.queryByRole('link', { name: 'Costs and latency' })).not.toBeInTheDocument();
    unmount();
    renderRoute('/admin/metrics');
    expect(await screen.findByRole('heading', { name: 'No access' })).toBeInTheDocument();
  });
});

describe('/admin/review (FR-24)', () => {
  it('lists open items and approves one, which leaves the list at once', async () => {
    signInAs('reviewer');
    let body: ReviewResolveRequest | undefined;
    const resolved = new Set<string>();
    server.use(
      // Like the API: once resolved, an item is no longer in the open list.
      http.get('/v1/admin/review-queue', ({ response }) => {
        const items = mockReviewItems.filter((i) => i.status === 'open' && !resolved.has(i.id));
        return response(200).json({ items, openCount: items.length, nextCursor: null });
      }),
      http.patch('/v1/admin/review-queue/{id}', async ({ params, request, response }) => {
        body = await request.json();
        resolved.add(params.id);
        return response(200).json({
          id: params.id,
          kind: 'resource',
          targetId: 'res-2-yt',
          reason: 'x',
          status: 'resolved',
          resolution: 'approved',
          createdAt: '2026-10-21T09:00:00Z',
        });
      }),
    );
    const { container } = renderRoute('/admin/review');
    const cards = await screen.findAllByRole('article');
    expect(cards).toHaveLength(3);
    expect(screen.getByRole('link', { name: /Review queue 3 open/ })).toBeInTheDocument();
    await expectNoAxeViolations(container);

    const first = cards[0]!;
    expect(within(first).getByText('Resource')).toBeInTheDocument();
    await userEvent.type(within(first).getByLabelText('Note (optional)'), 'Swapped in the API');
    await userEvent.click(within(first).getByRole('button', { name: 'Approve' }));
    await waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(2);
    });
    expect(body).toEqual({ resolution: 'approved', note: 'Swapped in the API' });
    expect((await screen.findAllByText('Approved')).length).toBeGreaterThan(0);
    expect(await screen.findByRole('link', { name: /Review queue 2 open/ })).toBeInTheDocument();
  });

  it('puts the item back with a toast when resolving fails', async () => {
    signInAs('reviewer');
    server.use(
      http.patch('/v1/admin/review-queue/{id}', ({ response }) =>
        response.untyped(problemResponse(mockProblem(500, 'INTERNAL', 'Boom'))),
      ),
    );
    renderRoute('/admin/review');
    const cards = await screen.findAllByRole('article');
    await userEvent.click(within(cards[1]!).getByRole('button', { name: 'Reject' }));
    expect((await screen.findAllByText('Could not resolve that item')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('filters by reason or target and shows resolved items', async () => {
    signInAs('reviewer');
    const { router } = renderRoute('/admin/review');
    await screen.findAllByRole('article');
    await userEvent.type(screen.getByLabelText('Filter'), 'region');
    await waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(1);
    });
    await userEvent.clear(screen.getByLabelText('Filter'));
    await userEvent.type(screen.getByLabelText('Filter'), 'zzz');
    expect(await screen.findByText('No items match “zzz”.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Resolved' }));
    await userEvent.clear(screen.getByLabelText('Filter'));
    expect(await screen.findByText('Resolved: approved')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=resolved');
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('shows an empty queue', async () => {
    signInAs('reviewer');
    server.use(
      http.get('/v1/admin/review-queue', ({ response }) => response(200).json({ items: [], openCount: 0, nextCursor: null })),
    );
    renderRoute('/admin/review');
    expect(await screen.findByText('Nothing to review')).toBeInTheDocument();
  });
});

describe('/admin/metrics (FR-25)', () => {
  it('shows cost and latency per stage and model for the chosen range', async () => {
    signInAs('admin');
    const ranges: string[] = [];
    server.use(
      http.get('/v1/admin/metrics/cost', ({ request, response }) => {
        const url = new URL(request.url);
        ranges.push(`${url.searchParams.get('from')}..${url.searchParams.get('to')}`);
        return response(200).json({
          from: '2026-10-01',
          to: '2026-10-21',
          totalUsd: 4.12,
          rows: [
            { stage: 'design', provider: 'anthropic', model: 'claude-sonnet-5-5', calls: 40, inputTokens: 520_000, outputTokens: 90_000, cacheReadTokens: 300_000, costUsd: 3.4 },
          ],
        });
      }),
    );
    const { container, router } = renderRoute('/admin/metrics');
    const cost = await screen.findByRole('table', { name: /AI cost per pipeline stage/ });
    expect(within(cost).getByRole('rowheader', { name: 'design' }).closest('tr')).toHaveTextContent('520,000');
    expect(within(cost).getByText('$4.12')).toBeInTheDocument();
    const latency = await screen.findByRole('table', { name: /Latency per pipeline stage/ });
    expect(within(latency).getByRole('rowheader', { name: 'design' }).closest('tr')).toHaveTextContent('8.2 s');
    expect(within(latency).getByText('2.5%')).toBeInTheDocument();
    await expectNoAxeViolations(container);

    const from = screen.getByLabelText('From');
    await userEvent.clear(from);
    await userEvent.type(from, '2026-10-01');
    const to = screen.getByLabelText('To');
    await userEvent.clear(to);
    await userEvent.type(to, '2026-10-21');
    await userEvent.click(screen.getByRole('button', { name: 'Show' }));
    await waitFor(() => {
      expect(ranges.at(-1)).toBe('2026-10-01..2026-10-21');
    });
    expect(router.state.location.search).toBe('?from=2026-10-01&to=2026-10-21');
  });

  it('refuses a range that ends before it starts', async () => {
    signInAs('admin');
    renderRoute('/admin/metrics?from=2026-10-10&to=2026-10-20');
    const from = await screen.findByLabelText('From');
    await userEvent.clear(from);
    await userEvent.type(from, '2026-10-25');
    expect(screen.getByRole('alert')).toHaveTextContent('The start date must be on or before the end date.');
    expect(screen.getByRole('button', { name: 'Show' })).toBeDisabled();
  });
});
