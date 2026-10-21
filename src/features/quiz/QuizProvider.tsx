import { useReducer, type ReactNode } from 'react';
import { QuizDispatchContext, QuizQuestionsContext, QuizStateContext } from './context';
import { createQuizState, quizReducer } from './reducer';
import type { QuizQuestion } from './types';

export interface QuizProviderProps {
  quizId: string;
  questions: readonly QuizQuestion[];
  /** Mainly for tests; a new attempt otherwise gets a fresh UUID. */
  idempotencyKey?: string;
  children: ReactNode;
}

/** Owns one quiz instance's state (PRD-UI §7). Remount with a new `key` for a new attempt. */
export default function QuizProvider({ quizId, questions, idempotencyKey, children }: QuizProviderProps) {
  const [state, dispatch] = useReducer(quizReducer, undefined, () =>
    createQuizState(quizId, questions.length, idempotencyKey),
  );
  return (
    <QuizQuestionsContext value={questions}>
      <QuizDispatchContext value={dispatch}>
        <QuizStateContext value={state}>{children}</QuizStateContext>
      </QuizDispatchContext>
    </QuizQuestionsContext>
  );
}
