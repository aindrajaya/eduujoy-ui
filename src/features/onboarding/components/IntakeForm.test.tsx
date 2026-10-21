import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/errors';
import { expectNoAxeViolations } from '@/test/axe';
import IntakeForm from './IntakeForm';

async function fillValid() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('What do you want to learn?'), 'UX research');
  await user.type(screen.getByLabelText("What's your goal?"), 'Run usability studies');
  return user;
}

describe('IntakeForm', () => {
  it('renders an accessible form with sensible defaults', async () => {
    const { container } = render(<IntakeForm onSubmit={vi.fn()} defaultValues={{ weeklyHours: 5 }} />);
    expect(screen.getByLabelText('Hours per week')).toHaveValue(5);
    expect(screen.getByRole('checkbox', { name: 'Videos' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Research papers' })).not.toBeChecked();
    await expectNoAxeViolations(container);
  });

  it('validates on submit and does not call onSubmit', async () => {
    const onSubmit = vi.fn();
    const { container } = render(<IntakeForm onSubmit={onSubmit} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText('Hours per week'));
    await user.type(screen.getByLabelText('Hours per week'), '60');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByLabelText('What do you want to learn?')).toHaveAccessibleDescription(
      'Name a topic (at least 2 characters)',
    );
    expect(screen.getByLabelText('Hours per week')).toHaveAccessibleDescription('Between 1 and 40 hours a week');
    expect(onSubmit).not.toHaveBeenCalled();
    await expectNoAxeViolations(container);
  });

  it('submits typed values, formats and optional experience', async () => {
    const onSubmit = vi.fn();
    render(<IntakeForm onSubmit={onSubmit} />);
    const user = await fillValid();
    await user.click(screen.getByRole('checkbox', { name: 'Videos' }));
    await user.click(screen.getByRole('checkbox', { name: 'Research papers' }));
    await user.click(screen.getByText('Add your experience (optional)'));
    await user.type(screen.getByLabelText('Years of experience'), '2');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      topic: 'UX research',
      goal: 'Run usability studies',
      weeklyHours: 3,
      formats: ['text', 'papers'],
      years: 2,
      projectsShipped: undefined,
    });
  });

  it('shows server field errors on the matching fields and other errors as a message', () => {
    const error = new ApiError({
      status: 400,
      code: 'VALIDATION_FAILED',
      title: 'Invalid',
      fieldErrors: { text: 'Too vague to resolve', weeklyHours: 'Too many hours' },
    });
    render(<IntakeForm onSubmit={vi.fn()} error={error} errorMessage="Check the highlighted fields." />);
    expect(screen.getByLabelText('What do you want to learn?')).toHaveAccessibleDescription('Too vague to resolve');
    expect(screen.getByLabelText('Hours per week')).toHaveAccessibleDescription('Too many hours');
    expect(screen.getByRole('alert')).toHaveTextContent('Check the highlighted fields.');
  });

  it('shows the submitting state', () => {
    render(<IntakeForm onSubmit={vi.fn()} submitting />);
    expect(screen.getByRole('button', { name: 'Checking your topic…' })).toBeDisabled();
  });
});
