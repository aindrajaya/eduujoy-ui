import { useCallback, useEffect } from 'react';
import { useQuizDispatch, useQuizQuestions, useQuizState } from './context';
import QuestionView from './QuestionView';
import ReviewScreen, { type ReviewScreenProps } from './ReviewScreen';
import type { Answer } from './types';
import { useQuizDraft } from './useQuizDraft';
import { useQuizSubmit, type QuizSubmitOptions } from './useQuizSubmit';

export interface QuizRunnerProps<R> extends QuizSubmitOptions<R> {
  /** Drafts are stored per user (PRD-UI §7). */
  userId: string | undefined;
  allowSkip?: boolean;
  submitLabel?: string;
  /** Submit as soon as the last answer is committed (short batches like the diagnostic). */
  autoSubmit?: boolean;
  describeError?: ReviewScreenProps['describeError'];
}

/**
 * Runs one quiz inside a <QuizProvider>: a question at a time, then review and batch submit.
 * Used by the diagnostic (U6) and checkpoints (U9).
 */
export default function QuizRunner<R>({
  userId,
  allowSkip,
  submitLabel,
  autoSubmit = false,
  describeError,
  ...submitOptions
}: QuizRunnerProps<R>) {
  const questions = useQuizQuestions();
  const { index, answers, flagged, status } = useQuizState();
  const dispatch = useQuizDispatch();
  const { submit, waitingForNetwork } = useQuizSubmit(submitOptions);
  useQuizDraft(userId);

  // A failed auto-submit lands on the review screen with its retry, so this only fires on entry.
  useEffect(() => {
    if (autoSubmit && status === 'reviewing') void submit();
  }, [autoSubmit, status, submit]);

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

  // Auto-submitted batches skip review; the review screen only appears if the submit fails (retry).
  // `submitted` keeps the status until the parent swaps in the next batch or result.
  if (autoSubmit && (status === 'reviewing' || status === 'submitting' || status === 'submitted')) {
    return (
      <p role="status" className="py-12 text-center text-text-muted">
        {waitingForNetwork ? 'You are offline. Your answers will be sent when you reconnect.' : 'Saving your answers…'}
      </p>
    );
  }

  if (status !== 'answering') {
    return (
      <ReviewScreen
        onSubmit={() => void submit()}
        submitLabel={submitLabel}
        waitingForNetwork={waitingForNetwork}
        describeError={describeError}
      />
    );
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
      finalLabel={autoSubmit ? (submitLabel ?? 'Submit answers') : 'Review answers'}
      onCommit={onCommit}
      onToggleFlag={onToggleFlag}
      onBack={index > 0 ? onBack : undefined}
    />
  );
}
