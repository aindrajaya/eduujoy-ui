import { act, render, renderHook, screen } from '@testing-library/react';
import { memo, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useQuizDispatch, useQuizQuestions, useQuizState } from './context';
import QuizProvider from './QuizProvider';
import type { QuizQuestion } from './types';

const questions: QuizQuestion[] = [
  { id: 'q1', kind: 'single_choice', prompt: 'One?', options: [{ id: 'a', label: 'A' }] },
  { id: 'q2', kind: 'short_answer', prompt: 'Two?' },
];

describe('QuizProvider', () => {
  it('exposes state, dispatch and questions', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QuizProvider quizId="quiz-1" questions={questions} idempotencyKey="k">
        {children}
      </QuizProvider>
    );
    const { result } = renderHook(() => ({ state: useQuizState(), dispatch: useQuizDispatch(), questions: useQuizQuestions() }), { wrapper });
    expect(result.current.state).toMatchObject({ quizId: 'quiz-1', count: 2, idempotencyKey: 'k' });
    expect(result.current.questions).toBe(questions);
    act(() => {
      result.current.dispatch({ type: 'COMMIT', questionId: 'q1', answer: { optionIds: ['a'] } });
    });
    expect(result.current.state.index).toBe(1);
  });

  it('does not re-render dispatch-only consumers when state changes', () => {
    const renders = vi.fn();
    const NextButton = memo(function NextButton() {
      const dispatch = useQuizDispatch();
      renders();
      return (
        <button type="button" onClick={() => { dispatch({ type: 'COMMIT', questionId: 'q1', answer: { skipped: true } }); }}>
          Next
        </button>
      );
    });
    function Index() {
      return <p>Question {useQuizState().index + 1}</p>;
    }
    render(
      <QuizProvider quizId="quiz-1" questions={questions}>
        <Index />
        <NextButton />
      </QuizProvider>,
    );
    act(() => {
      screen.getByRole('button', { name: 'Next' }).click();
    });
    expect(screen.getByText('Question 2')).toBeInTheDocument();
    expect(renders).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useQuizState())).toThrow('useQuizState must be used inside <QuizProvider>');
    expect(() => renderHook(() => useQuizDispatch())).toThrow(/useQuizDispatch/);
    expect(() => renderHook(() => useQuizQuestions())).toThrow(/useQuizQuestions/);
  });
});
