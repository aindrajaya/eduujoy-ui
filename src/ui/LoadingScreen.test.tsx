import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import LoadingScreen from './LoadingScreen';

describe('LoadingScreen', () => {
  it('announces the default wait message as a status', async () => {
    const { container } = render(<LoadingScreen />);
    expect(screen.getByRole('status')).toHaveTextContent('Reading your goal…');
    await expectNoAxeViolations(container);
  });

  it('renders a custom title and message', () => {
    render(<LoadingScreen title="Finding videos" message="4 of 6" />);
    expect(screen.getByRole('heading', { name: 'Finding videos' })).toBeInTheDocument();
    expect(screen.getByText('4 of 6')).toBeInTheDocument();
  });
});
