import { Loader2 } from 'lucide-react';
import { useCallback } from 'react';
import { Link } from 'react-router';
import type { CheckpointItem, CheckpointResult } from '@/api/types';
import type { JobView } from '@/realtime/jobView';
import { formatRetryWait } from '@/lib/time';
import { useJobStream } from '@/realtime/useJobStream';
import StateMessage from '@/ui/StateMessage';

export interface GradingViewProps {
  jobId: string;
  items: readonly CheckpointItem[];
  stepHref: string;
  onGraded: (result: CheckpointResult) => void;
  onRetry: () => void;
}

/** US-05: open answers are graded by a job; its stream sends each graded answer, then the result. */
export default function GradingView({ jobId, items, stepHref, onGraded, onRetry }: GradingViewProps) {
  const onCompleted = useCallback(
    (done: JobView) => {
      if (done.completed?.result) onGraded(done.completed.result);
    },
    [onGraded],
  );
  const view = useJobStream(jobId, { onCompleted });
  const position = new Map(items.map((item, i) => [item.id, i + 1]));

  if (view.status === 'failed') {
    const paused = view.failed?.problem.code === 'AI_BUDGET_EXCEEDED';
    return (
      <div className="p-6">
        <StateMessage
          tone="danger"
          title="We couldn’t grade your answers"
          action={
            view.failed?.retryable ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-on-primary"
              >
                Try again
              </button>
            ) : (
              <Link to={stepHref} className="font-semibold text-primary underline">
                Back to the step
              </Link>
            )
          }
        >
          {paused
            ? `Grading has reached today’s limit. Try again ${formatRetryWait(undefined)}.`
            : 'Something went wrong while grading.'}
        </StateMessage>
      </div>
    );
  }

  if (view.status === 'completed' && !view.completed?.result) {
    // The contract makes the inline result optional; the path still records the grade.
    return (
      <div className="p-6">
        <StateMessage
          title="Your answers are graded"
          action={
            <Link to={stepHref} className="font-semibold text-primary underline">
              Back to the step
            </Link>
          }
        >
          Your score is on the step.
        </StateMessage>
      </div>
    );
  }

  const graded = view.partialItems;
  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-text">Grading your answers</h1>
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <p role="status" aria-live="polite" className="font-semibold text-primary">
          {view.status === 'reconnecting'
            ? 'Connection lost. Reconnecting…'
            : (view.progress?.message ?? 'Reading your answers…')}
        </p>
      </div>
      <p className="text-text-muted">Open answers are checked against the rubric. This usually takes a few seconds.</p>
      {graded.length > 0 && (
        <section aria-labelledby="graded-title" className="space-y-2">
          <h2 id="graded-title" className="font-semibold text-text">
            Graded so far
          </h2>
          <ul className="space-y-2">
            {graded.map((item) => (
              <li key={item.itemId} className="animate-fade-in rounded-card border border-border p-3 text-sm text-text">
                <span className="font-semibold">Question {position.get(item.itemId) ?? '?'}:</span> {item.score}%
                {item.feedback ? ` · ${item.feedback}` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
