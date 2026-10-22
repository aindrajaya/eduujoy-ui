import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { ApiError } from '@/api/errors';
import type { DiagnosticBatchResponse } from '@/api/types';
import { useSession } from '@/auth/session';
import { useCreatePath } from '@/features/paths/queries';
import QuizProvider from '@/features/quiz/QuizProvider';
import QuizRunner from '@/features/quiz/QuizRunner';
import type { QuizQuestion } from '@/features/quiz/types';
import AsyncView from '@/ui/AsyncView';
import { Skeleton, SkeletonText } from '@/ui/Skeleton';
import { formatRetryWait } from '@/lib/time';
import StateMessage from '@/ui/StateMessage';
import PlacementResult from './components/PlacementResult';
import { diagnosticKeys } from './keys';
import { apiDiagnosticAdapter } from './apiAdapter';
import { useDiagnostic, type DiagnosticState } from './queries';

function buildPathError(error: ApiError): string {
  switch (error.code) {
    case 'QUOTA_EXCEEDED':
      return 'You have used this month’s paths. Upgrade or buy a credit pack to build another.';
    case 'AI_BUDGET_EXCEEDED':
      return `Path building has reached today’s limit. Try again ${formatRetryWait(error.retryAfterMs)}.`;
    case 'CONFLICT':
      return 'A path is already being built for this placement.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'Could not reach the server. Check your connection and try again.';
    default:
      return 'We could not start your path. Please try again.';
  }
}

function DiagnosticSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-5 w-32" />
      <SkeletonText lines={2} />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function BatchQuiz({ id, batch, userId }: { id: string; batch: DiagnosticBatchResponse; userId: string | undefined }) {
  const client = useQueryClient();
  const items = useMemo(() => batch.items ?? [], [batch.items]);
  // DiagnosticItem kinds are a subset of the quiz engine's.
  const questions: QuizQuestion[] = useMemo(() => items.map((item) => ({ ...item })), [items]);
  const quizId = `diagnostic:${id}:${items[0]?.id ?? 'empty'}`;
  const { answered, estimatedTotal } = batch.progress;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex justify-between text-sm text-text-muted">
          <span>Quick diagnostic</span>
          <span>
            {answered} of about {estimatedTotal} answered
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Diagnostic progress"
          aria-valuemin={0}
          aria-valuemax={estimatedTotal}
          aria-valuenow={answered}
          className="sk-meter"
        >
          <div style={{ width: `${Math.min(100, (answered / Math.max(1, estimatedTotal)) * 100)}%` }} />
        </div>
      </div>
      <div className="sk-card">
      <QuizProvider key={quizId} quizId={quizId} questions={questions}>
        <QuizRunner
          userId={userId}
          allowSkip
          autoSubmit
          submitLabel="Continue"
          submit={(answers, idempotencyKey) => apiDiagnosticAdapter.submitAnswers(id, items, answers, idempotencyKey)}
          onSubmitted={(next) => {
            // Answer responses omit the topic; keep the one from the resumed state.
            client.setQueryData<DiagnosticState>(diagnosticKeys.batch(id), (prev) => ({ ...next, topic: prev?.topic }));
          }}
        />
      </QuizProvider>
      </div>
    </div>
  );
}

/** US-02: adaptive diagnostic in batches of about four, then the placement (FR-03, FR-04). */
export default function DiagnosticPage() {
  const { id = '' } = useParams();
  const query = useDiagnostic(id);
  const { data: me } = useSession();
  const createPath = useCreatePath();
  const navigate = useNavigate();

  if (query.error?.status === 404) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center p-6">
        <StateMessage
          title="This diagnostic isn’t available here"
          action={
            <Link to="/start" className="font-semibold text-primary underline">
              Start again
            </Link>
          }
        >
          Start from your topic again to begin a new diagnostic.
        </StateMessage>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-4 md:p-6">
      <AsyncView query={query} label="your diagnostic" skeleton={<DiagnosticSkeleton />}>
        {(batch) =>
          batch.status === 'completed' && batch.placement ? (
            <PlacementResult
              placement={batch.placement}
              topicName={batch.topic?.canonicalName}
              building={createPath.isPending}
              errorMessage={createPath.error ? buildPathError(createPath.error) : undefined}
              // Until A9 ships, POST /v1/paths answers 404: say so, with no retry.
              buildingUnavailable={createPath.error?.status === 404}
              onBuildPath={() => {
                const placementId = batch.placement?.id;
                if (!placementId) return;
                createPath.mutate(
                  { placementId },
                  {
                    onSuccess: (job) => {
                      void navigate(`/paths/new/${encodeURIComponent(job.jobId)}`);
                    },
                  },
                );
              }}
            />
          ) : (
            <BatchQuiz id={id} batch={batch} userId={me?.user.id} />
          )
        }
      </AsyncView>
    </main>
  );
}
