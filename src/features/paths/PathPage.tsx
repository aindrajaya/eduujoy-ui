import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import type { Path } from '@/api/types';
import { STAGE_LABEL } from '@/lib/levels';
import AsyncView from '@/ui/AsyncView';
import { Skeleton, SkeletonText } from '@/ui/Skeleton';
import StateMessage from '@/ui/StateMessage';
import StickyActionBar from '@/ui/StickyActionBar';
import StepList from './components/StepList';
import { currentStep, stepHref, usePath } from './pathQueries';

function PathSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-8 w-2/3" />
      <SkeletonText lines={2} />
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-card" />
      ))}
    </div>
  );
}

const NOT_READY: Partial<Record<Path['status'], { title: string; body: string }>> = {
  generating: { title: 'This path is still being built', body: 'It will show up here as soon as it’s ready.' },
  under_review: { title: 'This path is being checked', body: 'A reviewer is checking it before you start.' },
  failed: { title: 'This path could not be built', body: 'Start again from your topic to build a new one.' },
};

export function PathOverview({ path }: { path: Path }) {
  const notReady = NOT_READY[path.status];
  const done = path.stepsDone ?? path.steps.filter((s) => s.status === 'completed').length;
  const total = path.stepsTotal ?? path.steps.length;
  const next = currentStep(path);

  return (
    <>
      <div className="animate-fade-in space-y-6 p-4 pt-6 md:p-6">
        <Link to="/paths" className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          All paths
        </Link>
        <header className="space-y-2">
          <p className="font-semibold text-success">Your learning path</p>
          <h1 className="text-2xl font-bold text-text md:text-3xl">{path.topic.canonicalName}</h1>
          <p className="text-text-muted">
            From {STAGE_LABEL[path.from.stage]} to {STAGE_LABEL[path.to.stage]}
            {path.totalHours ? ` · about ${path.totalHours} h in total` : ''}
          </p>
          <div>
            <div className="mb-1 flex justify-between text-sm text-text-muted">
              <span>Progress</span>
              <span>
                {done} of {total} steps
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

        {notReady ? (
          <StateMessage tone={path.status === 'failed' ? 'danger' : 'neutral'} title={notReady.title}>
            {notReady.body}
          </StateMessage>
        ) : (
          <section aria-labelledby="steps-title" className="space-y-3">
            <h2 id="steps-title" className="text-lg font-bold text-text">
              Steps
            </h2>
            <StepList pathId={path.id} steps={path.steps} />
          </section>
        )}
      </div>
      {!notReady && next && (
        <StickyActionBar label={`Continue: Step ${next.n}`} to={stepHref(path.id, next.id)} aboveTabs />
      )}
    </>
  );
}

/** US-03: the SOP overview for one path (PRD-UI §3). */
export default function PathPage() {
  const { id = '' } = useParams();
  const query = usePath(id);

  if (query.error?.status === 404) {
    return (
      <div className="p-6">
        <StateMessage
          title="Path not found"
          action={
            <Link to="/paths" className="font-semibold text-primary underline">
              All paths
            </Link>
          }
        >
          It may have been removed.
        </StateMessage>
      </div>
    );
  }

  return (
    <AsyncView query={query} label="your path" skeleton={<PathSkeleton />}>
      {(path) => <PathOverview path={path} />}
    </AsyncView>
  );
}
