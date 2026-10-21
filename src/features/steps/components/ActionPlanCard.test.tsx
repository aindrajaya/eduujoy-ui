import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { demoActionPlan } from '@/fixtures/demo';
import { expectNoAxeViolations } from '@/test/axe';
import ActionPlanCard from './ActionPlanCard';

describe('ActionPlanCard', () => {
  it('renders the three plan entries', async () => {
    const { container } = render(<ActionPlanCard plan={demoActionPlan} />);
    expect(screen.getByRole('heading', { name: 'Your Action Plan' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText(demoActionPlan.quickStart, { exact: false })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
