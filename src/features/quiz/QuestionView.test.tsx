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
const linked: QuizQuestion = {
  id: 'q4',
  kind: 'linked_choice',
  prompt: 'Two plans for a test in 10 days.',
  parts: [
    { id: 'which', prompt: 'Which plan is better?', options: [{ id: 'w-a', label: 'Plan A' }, { id: 'w-b', label: 'Plan B' }] },
    { id: 'why', prompt: 'Why?', options: [{ id: 'y-a', label: 'More hours' }, { id: 'y-b', label: 'Spaced retrieval' }] },
  ],
};
const order: QuizQuestion = {
  id: 'q5',
  kind: 'order',
  prompt: 'Arrange the week.',
  options: [
    { id: 'read', label: 'Read chapter 1' },
    { id: 'quiz', label: 'Self-quiz on chapter 1' },
    { id: 'mock', label: 'Mock exam' },
  ],
};

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

  it('linked choice: both parts are required, then both commit in part order', async () => {
    const { onCommit, container } = view({ question: linked });
    await userEvent.click(screen.getByRole('radio', { name: 'Plan B' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Answer both parts to continue.');
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: 'Why?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Spaced retrieval' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onCommit).toHaveBeenCalledWith('q4', { optionIds: ['w-b', 'y-b'] });
    await expectNoAxeViolations(container);
  });

  it('linked choice restores both parts from a draft', () => {
    view({ question: linked, defaultAnswer: { optionIds: ['w-a', 'y-b'] } });
    expect(screen.getByRole('radio', { name: 'Plan A' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Spaced retrieval' })).toBeChecked();
  });

  it('order: buttons move a block, announce it, keep focus on it, and Next commits the order', async () => {
    const { onCommit, container } = view({ question: order });
    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: 'Move “Read chapter 1” up' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Move “Mock exam” up' }));
    expect(screen.getByRole('status')).toHaveTextContent('Mock exam moved to position 2 of 3.');
    expect(screen.getByRole('button', { name: 'Move “Mock exam” up' })).toHaveFocus();
    // Keyboard only: Enter on the focused button moves it again; at the top, focus goes to "down".
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Move “Mock exam” down' })).toHaveFocus();
    await user.keyboard('{Enter}');
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['1Read chapter 1', '2Mock exam', '3Self-quiz on chapter 1']);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onCommit).toHaveBeenCalledWith('q5', { optionIds: ['read', 'mock', 'quiz'] });
    await expectNoAxeViolations(container);
  });

  it('order restores a saved order, and ignores one that does not match the blocks', () => {
    const { unmount } = view({ question: order, defaultAnswer: { optionIds: ['mock', 'quiz', 'read'] } });
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Mock exam');
    unmount();
    view({ question: order, defaultAnswer: { optionIds: ['mock', 'other', 'read'] } });
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Read chapter 1');
  });

  it('the skip action can say “I don’t know yet”', async () => {
    const { onCommit } = view({ question: single, allowSkip: true, skipLabel: 'I don’t know yet' });
    await userEvent.click(screen.getByRole('button', { name: 'I don’t know yet' }));
    expect(onCommit).toHaveBeenCalledWith('q1', { skipped: true });
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
