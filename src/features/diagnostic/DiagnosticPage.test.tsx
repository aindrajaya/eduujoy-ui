import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

// The seeded-batch summary is covered end to end in features/onboarding/StartPage.test.tsx.
describe('/diagnostic/:id hand-off', () => {
  it('explains when the diagnostic is not available (e.g. after a reload)', async () => {
    const { container } = renderRoute('/diagnostic/unknown');
    expect(await screen.findByText('This diagnostic isn’t available here')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start again' })).toHaveAttribute('href', '/start');
    await expectNoAxeViolations(container);
  });
});
