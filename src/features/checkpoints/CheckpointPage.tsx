import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import type { CheckpointResult, Path, PathStep } from '@/api/types';
import { useSession } from '@/auth/session';
import { findStep, stepHref, useRoutedPath } from '@/features/paths/pathQueries';
import QuizProvider from '@/features/quiz/QuizProvider';
import QuizRunner from '@/features/quiz/QuizRunner';
import AsyncView from '@/ui/AsyncView';
import { Skeleton, SkeletonText } from '@/ui/Skeleton';
import StateMessage from '@/ui/StateMessage';
import CheckpointResultView from './components/CheckpointResultView';
import GradingView from './components/GradingView';
import { describeSubmitError, onCheckpointGraded, submitAnswers, toQuizQuestions } from './queries';

function CheckpointSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-8 w-3/4" />
      <SkeletonText lines={2} />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

interface FlowProps {
  path: Path;
  step: PathStep;
  /** A grading job in flight, kept in the URL so a reload resumes its stream. */
  jobId: string | null;
  onJob: (jobId: string | null) => void;
}

function CheckpointFlow({ path, step, jobId, onJob }: FlowProps) {
  const client = useQueryClient();
  const { data: me } = useSession();
  const [result, setResult] = useState<CheckpointResult | null>(null);
  // Bumped on "Try again" so the quiz remounts with a fresh attempt key.
  const [retries, setRetries] = useState(0);
  const { checkpoint } = step;
  const questions = useMemo(() => toQuizQuestions(checkpoint.items), [checkpoint.items]);
  const backToStep = stepHref(path.id, step.id);

  const onGraded = useCallback(
    (graded: CheckpointResult) => {
      setResult(graded);
      onCheckpointGraded(client);
    },
    [client],
  );
  const retry = useCallback(() => {
    setResult(null);
    onJob(null);
    setRetries((n) => n + 1);
  }, [onJob]);

  if (result) return <CheckpointResultView path={path} step={step} result={result} onRetry={retry} />;
  if (jobId) {
    return <GradingView jobId={jobId} items={checkpoint.items} stepHref={backToStep} onGraded={onGraded} onRetry={retry} />;
  }

  if (step.status === 'locked') {
    return (
      <div className="p-6">
        <StateMessage
          title="This checkpoint is not open yet"
          action={
            <Link to={`/paths/${encodeURIComponent(path.id)}`} className="font-semibold text-primary underline">
              Back to path
            </Link>
          }
        >
          Finish the steps before it first.
        </StateMessage>
      </div>
    );
  }

  // Drafts are kept per server attempt (PRD-UI §7); a confirmed submit clears them.
  const quizId = `checkpoint:${step.id}:${checkpoint.attempts ?? 0}`;
  const hasOpen = checkpoint.items.some((item) => item.kind === 'open' || item.kind === 'short_answer');

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-text-muted">
          Step {step.n} checkpoint
          {checkpoint.attempts ? ` · attempt ${checkpoint.attempts + 1}` : ''}
        </p>
        <h1 className="text-text md:text-3xl">{step.objective}</h1>
        <p className="text-text-muted">
          {checkpoint.items.length} {checkpoint.items.length === 1 ? 'question' : 'questions'} · pass mark{' '}
          {checkpoint.passScore}%
          {checkpoint.lastScore !== undefined && checkpoint.lastScore !== null
            ? ` · last score ${checkpoint.lastScore}%`
            : ''}
        </p>
      </header>
      {hasOpen && checkpoint.rubric && checkpoint.rubric.length > 0 && (
        <section aria-labelledby="rubric-title" className="space-y-2 rounded-card border-2 border-ink bg-surface-muted p-4">
          <h2 id="rubric-title" className="sk-title text-text">
            A good written answer
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-text">
            {checkpoint.rubric.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}
      <QuizProvider key={`${quizId}:${retries}`} quizId={quizId} questions={questions}>
        <QuizRunner
          userId={me?.user.id}
          waitForOnline
          submitLabel="Submit answers"
          describeError={describeSubmitError}
          submit={(answers, idempotencyKey) => submitAnswers(step.id, checkpoint.items, answers, idempotencyKey)}
          onSubmitted={(submission) => {
            if (submission.kind === 'graded') onGraded(submission.result);
            else onJob(submission.job.jobId);
          }}
        />
      </QuizProvider>
    </div>
  );
}

/** US-05: a step's checkpoint, its grading (SSE for open answers) and the result (PRD-UI §3, §7). */
export default function CheckpointPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { path, isPending, noPath } = useRoutedPath(params.get('path'));
  const jobId = params.get('job');

  const onJob = useCallback(
    (next: string | null) => {
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev);
          if (next) updated.set('job', next);
          else updated.delete('job');
          return updated;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const notFound = (pathId?: string) => (
    <div className="p-6">
      <StateMessage
        title="Checkpoint not found"
        action={
          <Link
            to={pathId ? `/paths/${encodeURIComponent(pathId)}` : '/today'}
            className="font-semibold text-primary underline"
          >
            {pathId ? 'Back to path' : 'Back to Today'}
          </Link>
        }
      >
        This checkpoint is not part of an active path.
      </StateMessage>
    </div>
  );

  return (
    <main>
      {noPath ? (
        notFound()
      ) : (
        <AsyncView query={{ ...path, isPending }} label="this checkpoint" skeleton={<CheckpointSkeleton />}>
          {(data) => {
            const step = findStep(data, id);
            if (!step) return notFound(data.id);
            return (
              <>
                <nav className="px-4 pt-4 md:px-6">
                  <Link
                    to={stepHref(data.id, step.id)}
                    className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back to the step
                  </Link>
                </nav>
                <CheckpointFlow path={data} step={step} jobId={jobId} onJob={onJob} />
              </>
            );
          }}
        </AsyncView>
      )}
    </main>
  );
}
