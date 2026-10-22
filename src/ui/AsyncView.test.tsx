import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/errors';
import { expectNoAxeViolations } from '@/test/axe';
import AsyncView, { type AsyncQuery } from './AsyncView';

const base: AsyncQuery<string[]> = {
  data: undefined,
  error: null,
  isPending: false,
  isRefetching: false,
  refetch: vi.fn(),
};

function view(query: Partial<AsyncQuery<string[]>>) {
  return render(
    <AsyncView
      query={{ ...base, ...query }}
      label="your paths"
      skeleton={<div data-testid="skeleton" />}
      isEmpty={(d) => d.length === 0}
      empty={<p>No paths yet</p>}
    >
      {(data) => <ul>{data.map((d) => <li key={d}>{d}</li>)}</ul>}
    </AsyncView>,
  );
}

describe('AsyncView', () => {
  it('loading: a busy status wrapping the skeleton', async () => {
    const { container } = view({ isPending: true });
    expect(screen.getByRole('status', { name: 'Loading your paths' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('error: explains and retries', async () => {
    const refetch = vi.fn();
    const error = new ApiError({ status: 0, code: 'NETWORK_ERROR', title: 'offline' });
    const { container } = view({ error, refetch });
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your paths');
    expect(screen.getByRole('alert')).toHaveTextContent('could not reach the server');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
    await expectNoAxeViolations(container);
  });

  it('error while retrying disables the button', () => {
    view({ error: new ApiError({ status: 500, code: 'INTERNAL', title: 'x' }), isRefetching: true });
    expect(screen.getByRole('button', { name: 'Retrying…' })).toBeDisabled();
  });

  it('empty and success', () => {
    const empty = view({ data: [] });
    expect(screen.getByText('No paths yet')).toBeInTheDocument();
    empty.unmount();
    view({ data: ['UX', 'SQL'] });
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
