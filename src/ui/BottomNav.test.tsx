import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import BottomNav from './BottomNav';

describe('BottomNav', () => {
  it('renders the four tabs and marks the current one', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/paths']}>
        <BottomNav />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Today',
      'Paths',
      'Progress',
      'Account',
    ]);
    expect(screen.getByRole('link', { name: 'Paths' })).toHaveAttribute('aria-current', 'page');
    await expectNoAxeViolations(container);
  });
});
