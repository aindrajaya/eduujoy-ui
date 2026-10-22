import { CircleCheck, CircleX } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { CheckpointResult, Path, PathStep } from '@/api/types';
import { stepHref } from '@/features/paths/pathQueries';
import StickyActionBar, { type StickyActionBarProps } from '@/ui/StickyActionBar';

export interface CheckpointResultViewProps {
  path: Path;
  step: PathStep;
  result: CheckpointResult;
  onRetry: () => void;
}

/** The screen's one primary action after a graded attempt (US-05). */
function primaryAction(path: Path, result: CheckpointResult, onRetry: () => void): StickyActionBarProps {
  if (result.passed) {
    if (result.stageAdvanced) {
      // Contract 0.3.0: the re-assessment and next-path job (US-06); without it, Today shows the path.
      return result.nextPathJob
        ? { label: 'See your next path being built', to: `/paths/new/${encodeURIComponent(result.nextPathJob.jobId)}` }
        : { label: 'Back to Today', to: '/today' };
    }
    const next = path.steps.find((s) => s.id === result.nextStepId);
    if (result.nextStepId) {
      return { label: next ? `Next: Step ${next.n}` : 'Next step', to: stepHref(path.id, result.nextStepId) };
    }
    return { label: 'Back to path', to: `/paths/${encodeURIComponent(path.id)}` };
  }
  if (result.remedialStepId) return { label: 'Go to the review step', to: stepHref(path.id, result.remedialStepId) };
  return { label: 'Try again', onClick: onRetry };
}

/** US-05: score against the pass mark, per-answer feedback, and what happens next. */
export default function CheckpointResultView({ path, step, result, onRetry }: CheckpointResultViewProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { passScore } = step.checkpoint;
  const prompts = new Map(step.checkpoint.items.map((item) => [item.id, item.prompt]));

  // The result replaces the quiz in place; move focus so screen readers start at the outcome.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const Icon = result.passed ? CircleCheck : CircleX;

  return (
    <>
      <div className="animate-fade-in space-y-6 p-4 md:p-6">
        <section aria-labelledby="result-title" className="space-y-3">
          <div className="flex items-center gap-3">
            <Icon className={`h-8 w-8 ${result.passed ? 'text-success' : 'text-danger'}`} aria-hidden="true" />
            <h1 id="result-title" ref={heading} tabIndex={-1} className="text-text outline-none md:text-3xl">
              {result.passed ? 'You passed this checkpoint' : 'Not passed yet'}
            </h1>
          </div>
          <p className="text-text">
            Your score: <span className="font-bold">{result.score}%</span>
            <span className="text-text-muted"> · pass mark {passScore}%</span>
          </p>
          <div
            role="meter"
            aria-label="Your score"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={result.score}
            aria-valuetext={`${result.score}%, pass mark ${passScore}%`}
            className="relative h-3 overflow-hidden rounded-chip border-2 border-ink bg-surface"
          >
            <div className={`h-full ${result.passed ? 'bg-success' : 'bg-danger'}`} style={{ width: `${result.score}%` }} />
            <div className="absolute inset-y-0 w-0.5 bg-text" style={{ left: `${passScore}%` }} aria-hidden="true" />
          </div>
          {result.passed && result.stageAdvanced && (
            <p role="note" className="rounded-card border-2 border-success bg-surface p-3 text-sm text-text">
              You reached the next stage. We are checking your level and building your next path
              {result.nextPathJob ? '.' : '; it appears on Today when it is ready.'}
            </p>
          )}
          {!result.passed && result.remedialStepId && (
            <p role="note" className="rounded-card border-2 border-primary bg-surface p-3 text-sm text-text">
              We added a review step one level lower, with a different resource. Do it first, then come back to this
              checkpoint.
            </p>
          )}
          {!result.passed && !result.remedialStepId && (
            <p className="text-sm text-text-muted">
              Read the feedback below, then try again. If you miss it twice, we add a review step to help.
            </p>
          )}
        </section>

        <section aria-labelledby="feedback-title" className="space-y-3">
          <h2 id="feedback-title" className="sk-display-md text-text">
            Feedback on your answers
          </h2>
          <ol className="space-y-3">
            {result.items.map((item, i) => (
              <li key={item.itemId} className="sk-card space-y-1">
                <p className="flex justify-between gap-3 text-sm text-text-muted">
                  <span>Question {i + 1}</span>
                  <span className="font-semibold text-text">{item.score}%</span>
                </p>
                {prompts.get(item.itemId) && <p className="font-semibold text-text">{prompts.get(item.itemId)}</p>}
                {item.feedback && <p className="text-text">{item.feedback}</p>}
                {item.misconception && (
                  <p className="text-sm text-text-muted">
                    <span className="font-semibold">Common mix-up:</span> {item.misconception}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>
      <StickyActionBar {...primaryAction(path, result, onRetry)} />
    </>
  );
}
