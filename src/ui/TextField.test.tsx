import { render, screen } from '@testing-library/react';
import { Mail } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import TextField from './TextField';

describe('TextField', () => {
  it('labels the input and describes it with the hint', async () => {
    const { container } = render(<TextField label="Email" icon={Mail} hint="We never share it." />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAccessibleDescription('We never share it.');
    expect(input).not.toHaveAttribute('aria-invalid');
    await expectNoAxeViolations(container);
  });

  it('marks the input invalid and replaces the hint with the error', async () => {
    const { container } = render(<TextField label="Password" hint="10+ characters" error="Too short" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Too short');
    expect(screen.queryByText('10+ characters')).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
