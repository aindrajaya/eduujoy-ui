import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

describe.each([
  ['/paths', 'Your paths'],
  ['/progress', 'Progress'],
])('%s', (path, heading) => {
  it('renders in the tabs layout', async () => {
    const { container } = renderRoute(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
