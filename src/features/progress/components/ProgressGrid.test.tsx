import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import ProgressGrid from './ProgressGrid';

describe('ProgressGrid (US-09)', () => {
  it('marks the current cell and earlier positions in a readable table', async () => {
    const { container } = render(
      <ProgressGrid
        topicName="Product Design"
        current={{ stage: 'advanced_beginner', bloom: 'C3' }}
        history={[{ position: { stage: 'advanced_beginner', bloom: 'C2' }, label: '14 Oct' }]}
      />,
    );
    const table = screen.getByRole('table', { name: /Product Design: your position/ });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(6); // header + five stages
    expect(within(rows[1]!).getByRole('rowheader')).toHaveTextContent('Expert');
    const row = within(table).getByRole('rowheader', { name: 'Advanced beginner' }).closest('tr')!;
    const cells = within(row).getAllByRole('cell');
    expect(cells[2]).toHaveTextContent('You are here');
    expect(cells[1]).toHaveTextContent('Earlier: 14 Oct');
    expect(within(table).getAllByText('You are here')).toHaveLength(1);
    await expectNoAxeViolations(container);
  });

  it('shows only the current mark when an earlier position is the same cell', () => {
    render(
      <ProgressGrid
        topicName="T"
        current={{ stage: 'novice', bloom: 'C1' }}
        history={[{ position: { stage: 'novice', bloom: 'C1' }, label: '1 Oct' }]}
      />,
    );
    expect(screen.queryByText(/Earlier:/)).not.toBeInTheDocument();
  });
});
