import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import QuizProvider from './QuizProvider';
import QuizRunner from './QuizRunner';
import type { QuizQuestion } from './types';

const questions: QuizQuestion[] = [
  { id: 'q1', kind: 'single_choice', prompt: 'Pick one', options: [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }] },
  { id: 'q2', kind: 'short_answer', prompt: 'Explain briefly' },
];

afterEach(() => {
  window.localStorage.clear();
});

describe('QuizRunner', () => {
  it('answers, goes back with the answer kept, reviews and submits the batch', async () => {
    const submit = vi.fn().mockResolvedValue({ graded: true });
    const onSubmitted = vi.fn();
    const { container } = render(
      <QuizProvider quizId="quiz-1" questions={questions} idempotencyKey="key-1">
        <QuizRunner userId="u1" submit={submit} onSubmitted={onSubmitted} />
      </QuizProvider>,
    );
    const user = userEvent.setup();
    await expectNoAxeViolations(container);
    await user.click(screen.getByRole('radio', { name: 'Beta' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('radio', { name: 'Beta' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), 'Because users');
    await user.click(screen.getByRole('button', { name: 'Review answers' }));
    expect(await screen.findByRole('heading', { name: 'Review your answers' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Submit answers' }));
    await waitFor(() => {
      expect(onSubmitted).toHaveBeenCalledWith({ graded: true });
    });
    expect(submit).toHaveBeenCalledWith({ q1: { optionIds: ['b'] }, q2: { text: 'Because users' } }, 'key-1');
  });
});

describe('QuizRunner autoSubmit', () => {
  it('submits right after the last answer, without a review step', async () => {
    const submit = vi.fn().mockResolvedValue('ok');
    render(
      <QuizProvider quizId="quiz-2" questions={questions} idempotencyKey="key-2">
        <QuizRunner userId="u1" submit={submit} autoSubmit submitLabel="Continue" />
      </QuizProvider>,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: 'Alpha' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), 'Short');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByRole('heading', { name: 'Review your answers' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(submit).toHaveBeenCalledOnce();
    });
  });
});

describe('QuizRunner autoSubmit status', () => {
  it('shows a saving status (not the review screen) while the batch is sent', async () => {
    let release: (v: string) => void = () => undefined;
    const submit = vi.fn(() => new Promise<string>((r) => { release = r; }));
    render(
      <QuizProvider quizId="quiz-3" questions={questions.slice(0, 1)} idempotencyKey="key-3">
        <QuizRunner userId="u1" submit={submit} autoSubmit submitLabel="Continue" />
      </QuizProvider>,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'Alpha' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Saving your answers…')).toBeInTheDocument();
    release('ok');
  });
});
