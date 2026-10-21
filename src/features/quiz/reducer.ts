import type { ApiError } from '@/api/errors';
import type { Answer, QuizStatus } from './types';

// PRD-UI §7: one reducer per quiz instance. 100% branch coverage is a merge gate (PRD-UI §10).

export interface QuizState {
  quizId: string;
  /** Number of questions, so navigation can be clamped. */
  count: number;
  index: number;
  answers: Record<string, Answer>;
  flagged: ReadonlySet<string>;
  status: QuizStatus;
  /** Created once per attempt and reused for every retry of that attempt. */
  idempotencyKey: string;
  error: ApiError | null;
}

/** What drafts persist (PRD-UI §7). */
export interface QuizSnapshot {
  index?: number;
  answers?: Record<string, Answer>;
  flagged?: string[];
  idempotencyKey?: string;
}

export type QuizAction =
  | { type: 'COMMIT'; questionId: string; answer: Answer }
  | { type: 'GO_TO'; index: number }
  | { type: 'TOGGLE_FLAG'; questionId: string }
  | { type: 'REVIEW' }
  | { type: 'SUBMIT' }
  | { type: 'SUBMITTED' }
  | { type: 'FAILED'; error: ApiError }
  | { type: 'RESTORE'; snapshot: QuizSnapshot };

export function createQuizState(
  quizId: string,
  count: number,
  idempotencyKey: string = crypto.randomUUID(),
): QuizState {
  return {
    quizId,
    count,
    index: 0,
    answers: {},
    flagged: new Set(),
    status: 'answering',
    idempotencyKey,
    error: null,
  };
}

export function toSnapshot(state: QuizState): QuizSnapshot {
  return {
    index: state.index,
    answers: state.answers,
    flagged: [...state.flagged],
    idempotencyKey: state.idempotencyKey,
  };
}

const clamp = (index: number, count: number) => Math.min(Math.max(0, index), Math.max(0, count - 1));

/** Answers and navigation are frozen once the learner submits. */
const isLocked = (status: QuizStatus) => status === 'submitting' || status === 'submitted';

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'COMMIT': {
      if (isLocked(state.status)) return state;
      const answers = { ...state.answers, [action.questionId]: action.answer };
      const last = state.index >= state.count - 1;
      // "Next" on the last question opens the review screen.
      return last
        ? { ...state, answers, status: 'reviewing' }
        : { ...state, answers, index: state.index + 1, status: 'answering' };
    }
    case 'GO_TO':
      if (isLocked(state.status)) return state;
      return { ...state, index: clamp(action.index, state.count), status: 'answering' };
    case 'TOGGLE_FLAG': {
      if (isLocked(state.status)) return state;
      const flagged = new Set(state.flagged);
      if (flagged.has(action.questionId)) flagged.delete(action.questionId);
      else flagged.add(action.questionId);
      return { ...state, flagged };
    }
    case 'REVIEW':
      if (isLocked(state.status)) return state;
      return { ...state, status: 'reviewing' };
    case 'SUBMIT':
      // A second tap while submitting is a no-op; the same key covers every retry.
      if (isLocked(state.status)) return state;
      return { ...state, status: 'submitting', error: null };
    case 'SUBMITTED':
      if (state.status !== 'submitting') return state;
      return { ...state, status: 'submitted' };
    case 'FAILED':
      if (state.status !== 'submitting') return state;
      return { ...state, status: 'error', error: action.error };
    case 'RESTORE': {
      // Drafts only restore into a fresh, unsubmitted attempt.
      if (state.status !== 'answering') return state;
      const { snapshot } = action;
      return {
        ...state,
        index: snapshot.index === undefined ? state.index : clamp(snapshot.index, state.count),
        answers: { ...state.answers, ...snapshot.answers },
        flagged: snapshot.flagged ? new Set(snapshot.flagged) : state.flagged,
        idempotencyKey: snapshot.idempotencyKey ?? state.idempotencyKey,
      };
    }
  }
}
