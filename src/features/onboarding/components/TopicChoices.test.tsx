import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Topic } from '@/api/types';
import { expectNoAxeViolations } from '@/test/axe';
import TopicChoices from './TopicChoices';

const choices: Topic[] = [
  { id: 't1', canonicalName: 'Java (programming language)', description: 'The JVM language' },
  { id: 't2', canonicalName: 'JavaScript' },
  { id: 't3', canonicalName: 'Java coffee roasting', description: 'Roasting Indonesian beans' },
];

describe('TopicChoices', () => {
  it('lists up to three choices and needs a pick before continuing', async () => {
    const onConfirm = vi.fn();
    const { container } = render(
      <TopicChoices typed="java" choices={choices} onConfirm={onConfirm} onEditTopic={vi.fn()} onCreateNew={vi.fn()} />,
    );
    expect(screen.getByRole('heading', { name: 'Which topic did you mean?' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Continue with this topic' })).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: /JavaScript/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue with this topic' }));
    expect(onConfirm).toHaveBeenCalledWith(choices[1]);
    await expectNoAxeViolations(container);
  });

  it('never shows more than three choices', () => {
    const four = [...choices, { id: 't4', canonicalName: 'Java island travel' }];
    render(<TopicChoices typed="java" choices={four} onConfirm={vi.fn()} onEditTopic={vi.fn()} onCreateNew={vi.fn()} />);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.queryByText('Java island travel')).not.toBeInTheDocument();
  });

  it('lets the learner go back and rephrase', async () => {
    const onEditTopic = vi.fn();
    render(<TopicChoices typed="java" choices={choices} onConfirm={vi.fn()} onEditTopic={onEditTopic} onCreateNew={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'None of these, change my topic' }));
    expect(onEditTopic).toHaveBeenCalledOnce();
  });

  it('shows submitting and error states', () => {
    render(
      <TopicChoices typed="java" choices={choices} onConfirm={vi.fn()} onEditTopic={vi.fn()}
        onCreateNew={vi.fn()}
        submitting
        errorMessage="Try again."
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Try again.');
    expect(screen.getByRole('button', { name: 'Starting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Create “java” as a new topic' })).toBeDisabled();
  });

  it('offers to create the typed topic when none fits (contract 0.5.0)', async () => {
    const onCreateNew = vi.fn();
    render(<TopicChoices typed="java" choices={choices} onConfirm={vi.fn()} onEditTopic={vi.fn()} onCreateNew={onCreateNew} />);
    await userEvent.click(screen.getByRole('button', { name: 'Create “java” as a new topic' }));
    expect(onCreateNew).toHaveBeenCalledOnce();
  });
});
