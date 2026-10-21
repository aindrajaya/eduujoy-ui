import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { demoUser } from '@/fixtures/demo';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

describe('/account', () => {
  it('renders the profile in the tabs layout', async () => {
    const { container } = renderRoute('/account');
    expect(await screen.findByRole('heading', { name: demoUser.name })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('aria-current', 'page');
    await expectNoAxeViolations(container);
  });
});
