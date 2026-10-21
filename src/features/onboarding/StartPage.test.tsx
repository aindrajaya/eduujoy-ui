import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

describe('/start', () => {
  it('shows the splash, then the form, and continues to /today on submit', async () => {
    const user = userEvent.setup();
    const { container, router } = renderRoute('/start');
    await user.click(await screen.findByRole('button', { name: /get started/i }));
    await screen.findByRole('heading', { name: /let's get started/i }, { timeout: 2000 });
    await expectNoAxeViolations(container);

    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/learning goals/i), 'Become a product designer');
    await user.selectOptions(screen.getByLabelText(/skill category/i), 'designer');
    await user.selectOptions(screen.getByLabelText(/current skill level/i), 'beginner');
    await user.selectOptions(screen.getByLabelText(/learning pace/i), 'slow');
    await user.selectOptions(screen.getByLabelText(/preferred content type/i), 'reading');
    await user.click(screen.getByRole('button', { name: /generate my learning plan/i }));

    await screen.findByRole('navigation', { name: 'Main' });
    expect(router.state.location.pathname).toBe('/today');
  });

  it('redirects the root path to /start', async () => {
    const { router } = renderRoute('/');
    await screen.findByRole('heading', { name: /welcome to eduujoy/i });
    expect(router.state.location.pathname).toBe('/start');
  });
});
