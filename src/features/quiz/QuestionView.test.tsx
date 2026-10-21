import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import QuestionView, { type QuestionViewProps } from './QuestionView';
import type { QuizQuestion } from './types';

const single: QuizQuestion = {
  id: 'q1',
  kind: 'single_choice',
  prompt: 'Which method answers “why”?',
  options: [
    { id: 'a', label: 'Surveys' },
    { id: 'b', label: 'Interviews' },
    { id: 'c', label: 'Analytics' },
  ],
};
const multi: QuizQuestion = { ...single, id: 'q2', kind: 'multi_choice', prompt: 'Pick all qualitative methods' };
const text: QuizQuestion = { id: 'q3', kind: 'short_answer', prompt: 'Name one heuristic.' };

function view(props: Partial<QuestionViewProps> & { question: QuizQuestion }) {
  const handlers = { onCommit: vi.fn(), onToggleFlag: vi.fn(), onBack: vi.fn() };
  const utils = render(<QuestionView position={1} total={3} flagged={false} {...handlers} {...props} />);
  return { ...handlers, ...utils };
}

describe('QuestionView', () => {
  it('single choice: arrow keys move between options and Enter commits', async () => {
    const { onCommit, container } = view({ question: single });
    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: 'Surveys' }));
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Interviews' })).toBeChecked();
    await user.keyboard('{Enter}');
    expect(onCommit).toHaveBeenCalledWith('q1', { optionIds: ['b'] });
    await expectNoAxeViolations(container);
  });

  it('asks for an answer instead of committing an empty one', async () => {
    const { onCommit, container } = view({ question: single });
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose an answer to continue.');
    expect(onCommit).not.toHaveBeenCalled();
    await expectNoAxeViolations(container);
  });

  it('multi choice commits every checked option', async () => {
    const { onCommit } = view({ question: multi, defaultAnswer: { optionIds: ['a'] } });
    expect(screen.getByRole('checkbox', { name: 'Surveys' })).toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Interviews' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onCommit).toHaveBeenCalledWith('q2', { optionIds: ['a', 'b'] });
  });

  it('text: Enter is a new line, Ctrl+Enter commits the trimmed answer', async () => {
    const { onCommit, container } = view({ question: text, position: 3, total: 3 });
    const user = userEvent.setup();
    const box = screen.getByRole('textbox', { name: 'Your answer' });
    await user.type(box, '  Visibility{Enter}of status  ');
    expect(onCommit).not.toHaveBeenCalled();
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onCommit).toHaveBeenCalledWith('q3', { text: 'Visibility\nof status' });
    expect(screen.getByRole('button', { name: 'Review answers' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('empty text asks for an answer', async () => {
    view({ question: text });
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Write an answer to continue.');
  });

  it('skip, back and flag', async () => {
    const { onCommit, onBack, onToggleFlag } = view({ question: single, allowSkip: true, flagged: true });
    expect(screen.getByRole('button', { name: 'Flagged' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Flagged' }));
    expect(onToggleFlag).toHaveBeenCalledWith('q1');
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onCommit).toHaveBeenCalledWith('q1', { skipped: true });
  });
});
