import { useCallback } from 'react';
import { useQuizDispatch, useQuizQuestions, useQuizState } from './context';
import QuestionView from './QuestionView';
import ReviewScreen from './ReviewScreen';
import type { Answer } from './types';
import { useQuizDraft } from './useQuizDraft';
import { useQuizSubmit, type QuizSubmitOptions } from './useQuizSubmit';

export interface QuizRunnerProps<R> extends QuizSubmitOptions<R> {
  /** Drafts are stored per user (PRD-UI §7). */
  userId: string | undefined;
  allowSkip?: boolean;
  submitLabel?: string;
}

/**
 * Runs one quiz inside a <QuizProvider>: a question at a time, then review and batch submit.
 * Used by the diagnostic (U6) and checkpoints (U9).
 */
export default function QuizRunner<R>({ userId, allowSkip, submitLabel, ...submitOptions }: QuizRunnerProps<R>) {
  const questions = useQuizQuestions();
  const { index, answers, flagged, status } = useQuizState();
  const dispatch = useQuizDispatch();
  const { submit, waitingForNetwork } = useQuizSubmit(submitOptions);
  useQuizDraft(userId);

  // Stable callbacks keep the memoised QuestionView from re-rendering on unrelated changes.
  const onCommit = useCallback(
    (questionId: string, answer: Answer) => {
      dispatch({ type: 'COMMIT', questionId, answer });
    },
    [dispatch],
  );
  const onToggleFlag = useCallback(
    (questionId: string) => {
      dispatch({ type: 'TOGGLE_FLAG', questionId });
    },
    [dispatch],
  );
  const onBack = useCallback(() => {
    dispatch({ type: 'GO_TO', index: index - 1 });
  }, [dispatch, index]);

  if (status !== 'answering') {
    return <ReviewScreen onSubmit={() => void submit()} submitLabel={submitLabel} waitingForNetwork={waitingForNetwork} />;
  }

  const question = questions[index];
  if (!question) return null;

  return (
    <QuestionView
      key={question.id}
      question={question}
      position={index + 1}
      total={questions.length}
      defaultAnswer={answers[question.id]}
      flagged={flagged.has(question.id)}
      allowSkip={allowSkip}
      onCommit={onCommit}
      onToggleFlag={onToggleFlag}
      onBack={index > 0 ? onBack : undefined}
    />
  );
}
