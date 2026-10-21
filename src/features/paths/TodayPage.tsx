import { Clock } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import type { Path } from '@/api/types';
import { BLOOM_LABEL } from '@/lib/levels';
import AsyncView from '@/ui/AsyncView';
import { Skeleton, SkeletonText } from '@/ui/Skeleton';
import StateMessage from '@/ui/StateMessage';
import StickyActionBar from '@/ui/StickyActionBar';
import { currentStep, stepHref, useActivePaths, usePath } from './pathQueries';

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
 * PRD-UI §9: fetch the step screen's code once Today has rendered and the browser is idle; Today's
 * next tap goes there. Waiting for the data keeps the chunk off the LCP critical path.
 */
function usePrefetchStepScreen(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const load = () => void import('@/features/steps/StepPage');
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(load);
      return () => {
        window.cancelIdleCallback(id);
      };
    }
    const timer = setTimeout(load, 2000);
    return () => {
      clearTimeout(timer);
    };
  }, [ready]);
}

function TodayView({ path }: { path: Path }) {
  const step = currentStep(path);
  const done = path.stepsDone ?? path.steps.filter((s) => s.status === 'completed').length;
  const total = path.stepsTotal ?? path.steps.length;
  const upcoming = step ? path.steps.filter((s) => s.n > step.n).slice(0, 2) : [];

  return (
    <>
      <div className="animate-fade-in space-y-6 p-4 md:p-6">
        <header className="space-y-2">
          <p className="font-semibold text-success">Today</p>
          <h1 className="text-2xl font-bold text-text md:text-3xl">{path.topic.canonicalName}</h1>
          <div>
            <div className="mb-1 flex justify-between text-sm text-text-muted">
              <span>
                <Link to={`/paths/${encodeURIComponent(path.id)}`} className="font-semibold text-primary underline">
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
              className="h-2 overflow-hidden rounded-chip bg-surface-muted"
            >
              <div className="h-full bg-success" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
          </div>
        </header>

        {step ? (
          <section aria-labelledby="now-title" className="space-y-3 rounded-card bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 text-white shadow-xl">
            <p className="text-sm font-semibold text-indigo-100 uppercase">
              Step {step.n} of {total}
            </p>
            <h2 id="now-title" className="text-xl font-bold">
              {step.objective}
            </h2>
            <p className="flex flex-wrap gap-3 text-sm text-indigo-100">
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

        {upcoming.length > 0 && (
          <section aria-labelledby="next-title" className="space-y-2">
            <h2 id="next-title" className="font-semibold text-text">
              Coming up
            </h2>
            <ol className="space-y-2">
              {upcoming.map((s) => (
                <li key={s.id} className="rounded-card border border-border p-3 text-text">
                  <span className="font-semibold">Step {s.n}:</span> {s.objective}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
      {step && <StickyActionBar label={`Continue: Step ${step.n}`} to={stepHref(path.id, step.id)} aboveTabs />}
    </>
  );
}

/** US-03 home: the active path's current step and next action (PRD-UI §3). */
export default function TodayPage() {
  const active = useActivePaths();
  const summary = active.data?.[0];
  const path = usePath(summary?.id);
  usePrefetchStepScreen(path.isSuccess);

  if (active.isSuccess && !summary) {
    return (
      <div className="p-6">
        <StateMessage
          title="No active path yet"
          action={
            <Link
              to="/start"
              className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-on-primary"
            >
              Start a learning path
            </Link>
          }
        >
          Tell us what you want to learn and we’ll build a step-by-step path.
        </StateMessage>
      </div>
    );
  }

  return (
    <AsyncView
      query={{
        ...path,
        // A disabled path query (no active path yet) counts as pending; only wait for it once enabled.
        isPending: active.isPending || (summary !== undefined && path.isPending),
        error: active.error ?? path.error,
        refetch: () => (active.error ? active.refetch() : path.refetch()),
      }}
      label="today’s step"
      skeleton={<TodaySkeleton />}
    >
      {(data) => <TodayView path={data} />}
    </AsyncView>
  );
}
