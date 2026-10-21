import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

describe('/start', () => {
  it('shows the splash, then the form, and continues to /today on submit', { timeout: 15_000 }, async () => {
    const user = userEvent.setup();
    const { container, router } = renderRoute('/start');
    await user.click(await screen.findByRole('button', { name: /get started/i }));
    // The splash plays a 600 ms exit before the form mounts; wait for it to go rather than racing
    // findBy's default timeout under a loaded CI runner.
    await waitForElementToBeRemoved(() => screen.queryByRole('heading', { name: /welcome to eduujoy/i }), {
      timeout: 5000,
    });
    expect(screen.getByRole('heading', { name: /let's get started/i })).toBeInTheDocument();
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
});
