import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { demoProfile } from '@/fixtures/demo';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

describe('/today', () => {
  it('renders the learning path above the tab bar', async () => {
    const { container } = renderRoute('/today');
    expect(
      await screen.findByRole('heading', { level: 1, name: demoProfile.focusArea }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Continue: Module 1' })).toHaveAttribute('href', '/steps/1');
    await expectNoAxeViolations(container);
  });
});
