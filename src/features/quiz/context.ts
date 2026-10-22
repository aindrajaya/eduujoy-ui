import { createContext, useContext, type Dispatch } from 'react';
import type { QuizAction, QuizState } from './reducer';
import type { QuizQuestion } from './types';

// Separate contexts (PRD-UI §7): components that only dispatch never re-render on state changes.
export const QuizStateContext = createContext<QuizState | null>(null);
export const QuizDispatchContext = createContext<Dispatch<QuizAction> | null>(null);
export const QuizQuestionsContext = createContext<readonly QuizQuestion[] | null>(null);

function required<T>(value: T | null, hook: string): T {
  if (value === null) throw new Error(`${hook} must be used inside <QuizProvider>`);
  return value;
}

export function useQuizState(): QuizState {
  return required(useContext(QuizStateContext), 'useQuizState');
}

export function useQuizDispatch(): Dispatch<QuizAction> {
  return required(useContext(QuizDispatchContext), 'useQuizDispatch');
}

export function useQuizQuestions(): readonly QuizQuestion[] {
  return required(useContext(QuizQuestionsContext), 'useQuizQuestions');
}
