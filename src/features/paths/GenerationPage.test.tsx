import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import { renderRoute } from '@/test/render';

describe('/paths/new/:jobId (hand-off until U7)', () => {
  it('shows that the path is being built', async () => {
    const { container } = renderRoute('/paths/new/job-1');
    expect(await screen.findByRole('heading', { name: 'Building your path…' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
