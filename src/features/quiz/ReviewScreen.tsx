import { lazy, Suspense } from 'react';
import type { ApiError } from '@/api/errors';
import { Skeleton } from '@/ui/Skeleton';
import { useQuizQuestions, useQuizState } from './context';

const ReviewList = lazy(() => import('./ReviewList'));

export interface ReviewScreenProps {
  onSubmit: () => void;
  submitLabel?: string;
  /** Shown while submitting when the device is offline and the submit is queued. */
  waitingForNetwork?: boolean;
  /** Screen-specific copy for a failed submit; the generic copy covers the rest. */
  describeError?: (error: ApiError) => string | undefined;
}

/** Review before submit: answers at a glance, unanswered count, one primary action. */
export default function ReviewScreen({
  onSubmit,
  submitLabel = 'Submit answers',
  waitingForNetwork = false,
  describeError,
}: ReviewScreenProps) {
  const questions = useQuizQuestions();
  const { answers, status, error } = useQuizState();
  const unanswered = questions.filter((q) => !answers[q.id]).length;
  const submitting = status === 'submitting';

  return (
    <section aria-labelledby="review-title" className="space-y-4">
      <h2 id="review-title" className="text-xl font-semibold text-text">
        Review your answers
      </h2>
      <p className="text-text-muted">
        {unanswered === 0
          ? 'Everything is answered. Tap a question to change it.'
          : `${unanswered} of ${questions.length} not answered yet. Tap a question to answer it.`}
      </p>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <ReviewList />
      </Suspense>
      {status === 'error' && error && (
        <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {describeError?.(error) ??
            (error.status === 0
              ? 'Your answers are saved on this device, but we could not reach the server. Try again.'
              : 'We could not submit your answers. Try again.')}
        </p>
      )}
      <div aria-live="polite" className="text-sm text-text-muted">
        {submitting && waitingForNetwork ? 'You are offline. Your answers will be sent when you reconnect.' : null}
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || status === 'submitted'}
        className="min-h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 px-6 font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? 'Submitting…' : status === 'error' ? 'Try again' : submitLabel}
      </button>
    </section>
  );
}
