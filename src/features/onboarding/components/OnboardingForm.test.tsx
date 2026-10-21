import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import { validateField, type OnboardingValues } from '../validation';
import OnboardingForm from './OnboardingForm';

const filled: OnboardingValues = {
  email: 'jane@example.com',
  learningGoals: 'Grow into a senior product designer',
  skillCategory: 'designer',
  currentState: 'intermediate',
  learningStyle: 'slow',
  preferredContent: 'audioVisual',
};

describe('OnboardingForm', () => {
  it('shows the splash first and continues on its own', () => {
    vi.useFakeTimers();
    render(<OnboardingForm onSubmit={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /welcome to eduujoy/i })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole('heading', { name: /let's get started/i })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('blocks submit, flags every empty field and focuses the first', async () => {
    const onSubmit = vi.fn();
    const { container } = render(<OnboardingForm onSubmit={onSubmit} skipSplash />);
    await userEvent.click(screen.getByRole('button', { name: /generate my learning plan/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/email address/i)).toHaveFocus();
    expect(screen.getByLabelText(/email address/i)).toHaveAccessibleDescription(
      'Email Address is required',
    );
    await expectNoAxeViolations(container);
  });

  it('submits the values when valid', async () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <OnboardingForm onSubmit={onSubmit} defaultValues={filled} skipSplash />,
    );
    await expectNoAxeViolations(container);
    await userEvent.click(screen.getByRole('button', { name: /generate my learning plan/i }));
    expect(onSubmit).toHaveBeenCalledWith(filled);
  });

  it('shows submitting and submit error states', () => {
    render(<OnboardingForm onSubmit={vi.fn()} skipSplash submitting submitError="Try again." />);
    expect(screen.getByRole('button', { name: /creating your learning plan/i })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Try again.');
  });

  it('validates email format and goal length', () => {
    expect(validateField('email', 'nope')).toBe('Please enter a valid email address');
    expect(validateField('learningGoals', 'short')).toMatch(/at least 10/);
    expect(validateField('skillCategory', 'designer')).toBe('');
  });
});
