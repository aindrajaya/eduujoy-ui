import { useQueryClient } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import type { Path, PathStep, PathSummary } from '@/api/types';
import { afterFirstPaint } from '@/lib/idle';
import { BLOOM_LABEL } from '@/lib/levels';
import AsyncView from '@/ui/AsyncView';
import { Skeleton, SkeletonText } from '@/ui/Skeleton';
import StateMessage from '@/ui/StateMessage';
import StickyActionBar from '@/ui/StickyActionBar';
import PathBuildingSoon from './components/PathBuildingSoon';
import { isPathBuildingClosed } from './buildingClosed';
import { currentStep, pathQuery, stepHref, useActivePaths, usePath } from './pathQueries';

function TodaySkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-2 w-full" />
      <div className="space-y-3 rounded-card bg-surface-muted p-4">
        <Skeleton className="h-5 w-32 bg-border" />
        <SkeletonText lines={2} />
      </div>
      <Skeleton className="h-16 w-full rounded-card" />
      <Skeleton className="h-16 w-full rounded-card" />
    </div>
  );
}

/**
 * PRD-UI §9: once Today has rendered and the browser is idle, fetch the step screen's code and the
 * path it reads, so Today's next tap opens at once. Both stay off the LCP critical path.
 */
function usePrefetchStepScreen(pathId: string | undefined) {
  const client = useQueryClient();
  useEffect(() => {
    if (!pathId) return;
    const load = () => {
      void import('@/features/steps/StepPage');
      void client.query(pathQuery(pathId)).catch(() => undefined);
    };
    return afterFirstPaint(load);
  }, [client, pathId]);
}

type CurrentStep = Pick<PathStep, 'id' | 'n' | 'objective' | 'bloom' | 'estMinutes'>;

interface TodayData {
  summary: PathSummary;
  /** Undefined while the step is unknown; null when every step is done. */
  step: CurrentStep | null;
  /** The full path, only loaded when the list has no currentStep (an API before contract 0.3.0). */
  path: Path | undefined;
}

function TodayView({ summary, step, path }: TodayData) {
  const done = summary.stepsDone ?? path?.steps.filter((s) => s.status === 'completed').length ?? 0;
  const total = summary.stepsTotal ?? path?.steps.length ?? 0;

  return (
    <>
      <div className="animate-fade-in space-y-6 p-4 md:p-6">
        <header className="space-y-2">
          <p className="font-semibold text-text-muted">Today</p>
          <h1 className="text-text md:text-3xl">{summary.topic.canonicalName}</h1>
          <div>
            <div className="mb-1 flex justify-between text-sm text-text-muted">
              <span>
                <Link to={`/paths/${encodeURIComponent(summary.id)}`} className="font-semibold text-primary underline">
                  See the whole path
                </Link>
              </span>
              <span>
                {done} of {total} steps done
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Path progress"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              className="sk-meter"
            >
              <div style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
          </div>
        </header>

        {step ? (
          <section aria-labelledby="now-title" className="sk-card space-y-3 p-5 text-text">
            <p className="sk-label text-text-muted">
              Step {step.n} of {total}
            </p>
            <h2 id="now-title" className="sk-display-md">
              {step.objective}
            </h2>
            <p className="flex flex-wrap gap-3 text-sm text-text-muted">
              <span>
                {step.bloom} · {BLOOM_LABEL[step.bloom]}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" aria-hidden="true" />
                About {step.estMinutes} min
              </span>
            </p>
          </section>
        ) : (
          <StateMessage title="You finished every step">Pass the final checkpoint to move to the next stage.</StateMessage>
        )}

      </div>
      {step && <StickyActionBar label={`Continue: Step ${step.n}`} to={stepHref(summary.id, step.id)} aboveTabs />}
    </>
  );
}

/** The screen's h1 while there is no path to title it (loading, empty, error). */
function TodayTitle() {
  return <h1 className="px-6 pt-6 text-text md:text-3xl">Today</h1>;
}

/** US-03 home: the active path's current step and next action (PRD-UI §3). */
export default function TodayPage() {
  const active = useActivePaths();
  const summary = active.data?.[0];
  const path = usePath(summary && summary.currentStep === undefined ? summary.id : undefined);
  usePrefetchStepScreen(summary?.id);

  if (isPathBuildingClosed(active.error)) {
    return (
      <>
        <TodayTitle />
        <div className="p-6">
          <PathBuildingSoon />
        </div>
      </>
    );
  }

  if (active.isSuccess && !summary) {
    return (
      <>
        <TodayTitle />
        <div className="p-6">
          <StateMessage
            title="No active path yet"
            action={
              <Link
                to="/start"
                className="sk-btn sk-btn-primary"
              >
                Start a learning path
              </Link>
            }
          >
            Tell us what you want to learn and we’ll build a step-by-step path.
          </StateMessage>
        </div>
      </>
    );
  }

  // Contract 0.3.0: the list's currentStep renders Today on its own (PRD-UI §3); an API without
  // the field falls back to the path detail.
  const listStep = summary?.currentStep;
  const step = listStep !== undefined ? listStep : path.data ? (currentStep(path.data) ?? null) : undefined;
  const data: TodayData | undefined = summary && step !== undefined ? { summary, step, path: path.data } : undefined;

  return (
    <>
      {/* With a path, its name is the h1 (TodayView); until then the screen is titled "Today". */}
      {data === undefined && <TodayTitle />}
      <AsyncView
        query={{
          data,
          isPending: active.isPending || (summary !== undefined && step === undefined && path.isPending),
          error: active.error ?? (step === undefined ? path.error : null),
          isRefetching: active.isRefetching,
          refetch: () => (active.error ? active.refetch() : path.refetch()),
        }}
        label="today’s step"
        skeleton={<TodaySkeleton />}
      >
        {(today) => <TodayView {...today} />}
      </AsyncView>
    </>
  );
}
