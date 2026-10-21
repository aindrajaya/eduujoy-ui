import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { demoModules } from '@/fixtures/demo';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

describe('/steps/:id', () => {
  it('renders the matching module without the tab bar', async () => {
    const { container } = renderRoute('/steps/2');
    expect(
      await screen.findByRole('heading', { level: 1, name: demoModules[1]!.title }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('shows a not-found state for an unknown step', async () => {
    renderRoute('/steps/999');
    expect(await screen.findByRole('heading', { name: 'Step not found' })).toBeInTheDocument();
  });
});

describe('/steps/:id primary action', () => {
  it('points to the next module, or back to Today on the last one', async () => {
    const first = renderRoute('/steps/1');
    expect(await screen.findByRole('link', { name: 'Next: Module 2' })).toHaveAttribute('href', '/steps/2');
    first.unmount();
    renderRoute(`/steps/${demoModules.length}`);
    expect(await screen.findByRole('link', { name: 'Back to Today' })).toHaveAttribute('href', '/today');
  });
});
