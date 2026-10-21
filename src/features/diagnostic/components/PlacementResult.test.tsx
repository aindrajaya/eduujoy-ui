import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockDiagnosticCompleted } from '@/api/mocks/data';
import { expectNoAxeViolations } from '@/test/axe';
import PlacementResult from './PlacementResult';

const placement = mockDiagnosticCompleted.placement!;

describe('PlacementResult', () => {
  it('shows stage, Bloom level, confidence and the reason', async () => {
    const onBuildPath = vi.fn();
    const { container } = render(<PlacementResult placement={placement} topicName="UX research" onBuildPath={onBuildPath} />);
    expect(screen.getByRole('heading', { name: 'You’re at Advanced beginner in UX research' })).toBeInTheDocument();
    expect(screen.getByText('Apply')).toBeInTheDocument();
    expect(screen.getByText('(C3)')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText(placement.reason)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Build my path' }));
    expect(onBuildPath).toHaveBeenCalledOnce();
    await expectNoAxeViolations(container);
  });

  it('shows building and error states', () => {
    render(<PlacementResult placement={placement} onBuildPath={vi.fn()} building errorMessage="Try again." />);
    expect(screen.getByRole('heading', { name: 'You’re at Advanced beginner' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Starting your path…' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Try again.');
  });
});
