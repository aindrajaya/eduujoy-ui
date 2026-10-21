import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import StickyActionBar from './StickyActionBar';

describe('StickyActionBar', () => {
  it('renders one primary link above the tab bar on tab screens', async () => {
    const { container } = render(
      <MemoryRouter>
        <StickyActionBar label="Next step" to="/steps/2" aboveTabs />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Next step' })).toHaveAttribute('href', '/steps/2');
    expect(container.firstElementChild?.className).toContain('bottom-[calc(4rem+env(safe-area-inset-bottom))]');
    await expectNoAxeViolations(container);
  });

  it('sits on the safe-area edge on full-screen pages', () => {
    const { container } = render(
      <MemoryRouter>
        <StickyActionBar label="Back" to="/today" />
      </MemoryRouter>,
    );
    expect(container.firstElementChild?.className).toContain('bottom-0');
  });

  it('can hold an action on this screen instead of a link', async () => {
    const onClick = vi.fn();
    render(<StickyActionBar label="Try again" onClick={onClick} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
