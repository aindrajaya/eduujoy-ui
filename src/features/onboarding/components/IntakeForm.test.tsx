import { render, screen, waitFor, within } from '@testing-library/react';
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
    // The schema loads lazily, so the errors appear after the first submit settles.
    await waitFor(() => {
      expect(screen.getByLabelText('What do you want to learn?')).toHaveAccessibleDescription(
        'Name a topic (at least 2 characters)',
      );
    });
    expect(screen.getByLabelText('Hours per week')).toHaveAccessibleDescription('Between 1 and 40 hours a week');
    expect(onSubmit).not.toHaveBeenCalled();
    await expectNoAxeViolations(container);
  });

  it('cannot be submitted without an experience choice; the group explains why', async () => {
    const onSubmit = vi.fn();
    const { container } = render(<IntakeForm onSubmit={onSubmit} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('What do you want to learn?'), 'SQL');
    await user.type(screen.getByLabelText("What's your goal?"), 'Write my own reports');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    const group = screen.getByRole('group', { name: 'How much have you worked with SQL?' });
    await waitFor(() => {
      expect(group).toHaveAccessibleDescription(
        'This only sets where the questions start; your answers decide your level. Choose the option closest to you.',
      );
    });
    expect(onSubmit).not.toHaveBeenCalled();
    // The new-to-this option comes first; arrow keys move within the group.
    const radios = within(group).getAllByRole('radio');
    expect(radios[0]).toHaveAccessibleName('I’m new to this');
    radios[0]?.focus();
    await user.keyboard('{ArrowDown}');
    expect(radios[1]).toBeChecked();
    await expectNoAxeViolations(container);
  });

  it('submits typed values, formats and the experience choice', async () => {
    const onSubmit = vi.fn();
    render(<IntakeForm onSubmit={onSubmit} />);
    const user = await fillValid();
    await user.click(screen.getByRole('checkbox', { name: 'Videos' }));
    await user.click(screen.getByRole('checkbox', { name: 'Research papers' }));
    await user.click(screen.getByRole('radio', { name: 'Comfortable: a few years or several projects' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      topic: 'UX research',
      goal: 'Run usability studies',
      weeklyHours: 3,
      formats: ['text', 'papers'],
      experience: 'comfortable',
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
