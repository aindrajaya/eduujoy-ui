import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { JobProgressEvent } from '@/api/types';
import type { JobView } from '@/realtime/jobView';
import { useJobStream } from '@/realtime/useJobStream';
import StateMessage from '@/ui/StateMessage';
import { pathKeys } from './keys';
import { toast } from '@/ui/toast/store';

type Stage = JobProgressEvent['stage'];

// Path generation stages in order (contract JobProgressEvent.stage); grade/reassess are checkpoint jobs.
const STAGES: { stage: Stage; label: string }[] = [
  { stage: 'discover', label: 'Finding resources' },
  { stage: 'analyse', label: 'Analysing resources' },
  { stage: 'design', label: 'Designing your steps' },
  { stage: 'validate', label: 'Checking your path' },
];

const STAGE_LABEL: Partial<Record<Stage, string>> = {
  queued: 'Getting ready',
  ...Object.fromEntries(STAGES.map((s) => [s.stage, s.label])),
};

function announce(view: JobView): string {
  if (view.status === 'reconnecting') return 'Connection lost. Reconnecting…';
  const p = view.progress;
  if (!p) return 'Getting ready';
  const label = p.message ?? STAGE_LABEL[p.stage] ?? 'Working';
  return p.total > 0 ? `${label}, ${p.done} of ${p.total}` : label;
}

/** US-03: staged progress while the path is generated; it can be left and resumes on reload. */
export default function GenerationPage() {
  const { jobId = '' } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();

  const onCompleted = useCallback(
    (done: JobView) => {
      void client.invalidateQueries({ queryKey: pathKeys.all });
      toast({ title: 'Your path is ready', tone: 'success' });
      // resultRef is the new path's id; without one, Today shows the active path.
      const pathId = done.completed?.resultRef;
      void navigate(pathId ? `/paths/${encodeURIComponent(pathId)}` : '/today', { replace: true });
    },
    [client, navigate],
  );

  const view = useJobStream(jobId, { onCompleted });

  if (view.status === 'failed') {
    const retryable = view.failed?.retryable === true;
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center p-6">
        <StateMessage
          tone="danger"
          title="We couldn’t build your path"
          action={
            <Link to="/start" className="font-semibold text-primary underline">
              {retryable ? 'Try again from your topic' : 'Back to your topic'}
            </Link>
          }
        >
          {view.failed?.problem.code === 'NOT_FOUND'
            ? 'This build is no longer available.'
            : 'Something went wrong while building it. Nothing was charged.'}
        </StateMessage>
      </main>
    );
  }

  const current = view.progress?.stage;
  const currentIndex = STAGES.findIndex((s) => s.stage === current);

  return (
    <main className="mx-auto max-w-xl space-y-8 p-6 pt-12">
      <header>
        <h1 className="text-2xl font-bold text-text">Building your path…</h1>
        <p className="mt-2 text-text-muted">
          We are finding and checking the best free resources for your level. This takes about a minute, and you can
          leave this page.
        </p>
      </header>

      <p role="status" aria-live="polite" className="font-semibold text-primary">
        {announce(view)}
      </p>

      <ol className="space-y-3" aria-label="Build stages">
        {STAGES.map(({ stage, label }, i) => {
          const done = currentIndex > i;
          const active = currentIndex === i;
          return (
            <li key={stage} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  done ? 'border-success bg-success text-white' : active ? 'border-primary text-primary' : 'border-border text-text-muted'
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : i + 1}
              </span>
              <span className={active ? 'font-semibold text-text' : done ? 'text-text' : 'text-text-muted'}>
                {label}
                {active && view.progress && view.progress.total > 0 && (
                  <span className="ml-2 text-sm font-normal text-text-muted">
                    {view.progress.done} of {view.progress.total}
                  </span>
                )}
                <span className="sr-only">{done ? ' (done)' : active ? ' (in progress)' : ' (waiting)'}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {view.partialSteps.length > 0 && (
        <section aria-labelledby="first-steps" className="space-y-2">
          <h2 id="first-steps" className="font-semibold text-text">
            Your first steps
          </h2>
          <ul className="space-y-2">
            {view.partialSteps.map((step) => (
              <li key={step.id} className="animate-fade-in rounded-card border border-border p-3 text-sm text-text">
                <span className="font-semibold">Step {step.n}:</span> {step.objective}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link to="/today" className="inline-flex min-h-11 items-center font-semibold text-primary underline">
        Keep exploring while we build
      </Link>
    </main>
  );
}
