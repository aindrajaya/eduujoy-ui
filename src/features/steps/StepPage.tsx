import { ArrowLeft, Clock, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import type { Path, PathStep, StepPatchRequest } from '@/api/types';
import { checkpointHref, findStep, stepHref, useRoutedPath } from '@/features/paths/pathQueries';
import { BLOOM_LABEL } from '@/lib/levels';
import AsyncView from '@/ui/AsyncView';
import { Skeleton, SkeletonText } from '@/ui/Skeleton';
import StateMessage from '@/ui/StateMessage';
import StickyActionBar from '@/ui/StickyActionBar';
import { toast } from '@/ui/toast/store';
import ResourceCard, { type Thumb } from './components/ResourceCard';
import { useSendFeedback, useSwapResource, useUpdateStep } from './queries';

type Difficulty = NonNullable<StepPatchRequest['difficulty']>;

const DIFFICULTY: { value: Difficulty; label: string }[] = [
  { value: 'too_easy', label: 'Too easy' },
  { value: 'ok', label: 'About right' },
  { value: 'too_hard', label: 'Too hard' },
];

function StepSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-8 w-3/4" />
      <SkeletonText lines={2} />
      <Skeleton className="h-48 w-full rounded-card" />
      <Skeleton className="h-48 w-full rounded-card" />
    </div>
  );
}

function StepView({ path, step }: { path: Path; step: PathStep }) {
  const update = useUpdateStep(path.id);
  const swap = useSwapResource(path.id);
  const feedback = useSendFeedback();
  const [thumbs, setThumbs] = useState<Record<string, Thumb>>({});
  const next = path.steps.find((s) => s.n === step.n + 1);
  const lastScore = step.checkpoint.lastScore ?? null;
  // US-05: an open step ends in its checkpoint; finished and locked steps move on through the path.
  const canCheck = step.status === 'active';

  // Optimistic thumbs (PRD-UI §4): show the choice at once, undo it if the API refuses.
  const thumb = (targetType: 'resource' | 'step', targetId: string, kind: 'up' | 'down') => {
    const previous = thumbs[targetId] ?? null;
    setThumbs((t) => ({ ...t, [targetId]: kind }));
    feedback.mutate(
      { targetType, targetId, kind },
      {
        onError: () => {
          setThumbs((t) => ({ ...t, [targetId]: previous }));
          toast({ title: 'Could not save your feedback', tone: 'error' });
        },
      },
    );
  };

  const setDifficulty = (difficulty: Difficulty) => {
    update.mutate(
      { stepId: step.id, patch: { difficulty } },
      {
        onSuccess: () => {
          if (difficulty !== 'ok') toast({ title: 'Thanks. We’ll adjust your next steps.', tone: 'success' });
        },
      },
    );
  };

  return (
    <>
      <div className="animate-fade-in space-y-8 p-4 pt-6 md:p-6">
        <Link
          to={`/paths/${encodeURIComponent(path.id)}`}
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Back to path
        </Link>

        <header className="space-y-3">
          <p className="text-sm font-semibold text-text-muted">
            Step {step.n} of {path.steps.length}
            {step.remedial ? ' · Review step' : ''}
          </p>
          <h1 className="text-text md:text-3xl">{step.objective}</h1>
          <p className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
            <span className="sk-bloom-chip py-1 font-semibold text-text">
              {step.bloom} · {BLOOM_LABEL[step.bloom]}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" aria-hidden="true" />
              About {step.estMinutes} min
            </span>
          </p>
          {step.status === 'locked' && (
            <p role="note" className="flex items-start gap-2 rounded-lg border-2 border-warning bg-surface p-3 text-sm text-warning">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              This step opens after the ones before it. You can look ahead.
            </p>
          )}
          {step.remedial && (
            <p role="note" className="rounded-lg border-2 border-primary bg-surface p-3 text-sm text-text">
              We added this review step after two missed checkpoints. It is one level lower, with a different resource.
            </p>
          )}
          {lastScore !== null && (
            <p className="text-sm text-text-muted">
              {step.status === 'completed' ? 'Checkpoint passed' : 'Last checkpoint score'}: {lastScore}%
            </p>
          )}
          <p className="rounded-card border-2 border-ink bg-surface-muted p-4 text-text">
            <span className="font-semibold">Done when: </span>
            {step.doneWhen}
          </p>
        </header>

        <section aria-labelledby="actions-title" className="space-y-3">
          <h2 id="actions-title" className="sk-display-lg text-text">
            Actions
          </h2>
          <ol className="space-y-2">
            {step.actions.map((action) => (
              <li key={action.n}>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control p-2 hover:bg-surface-muted">
                  <input
                    type="checkbox"
                    checked={action.done}
                    onChange={(e) => {
                      update.mutate({ stepId: step.id, patch: { actionsDone: [{ n: action.n, done: e.target.checked }] } });
                    }}
                    className="mt-1 h-5 w-5 accent-primary"
                  />
                  <span className={action.done ? 'text-text-muted line-through' : 'text-text'}>
                    {action.n}. {action.text}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="resources-title" className="space-y-4">
          <h2 id="resources-title" className="sk-display-lg text-text">
            Resources
          </h2>
          {step.resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              thumb={thumbs[resource.id] ?? null}
              onThumb={(kind) => {
                thumb('resource', resource.id, kind);
              }}
              swapping={swap.isPending && swap.variables.resourceId === resource.id}
              onSwap={() => {
                swap.mutate({ resourceId: resource.id, stepId: step.id });
              }}
            />
          ))}
        </section>

        <section aria-labelledby="feel-title" className="sk-card space-y-3">
          <h2 id="feel-title" className="sk-title text-text">
            How did this step feel?
          </h2>
          <div role="radiogroup" aria-labelledby="feel-title" className="flex flex-wrap gap-2">
            {DIFFICULTY.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={step.difficulty === value}
                onClick={() => {
                  setDifficulty(value);
                }}
                className={`min-h-11 rounded-chip border-2 px-4 font-semibold ${
                  step.difficulty === value ? 'border-primary border-[length:var(--sk-stroke-strong)] text-primary' : 'border-ink text-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            Rate this step
            <button
              type="button"
              aria-pressed={thumbs[step.id] === 'up'}
              aria-label="This step was useful"
              onClick={() => {
                thumb('step', step.id, 'up');
              }}
              className={`flex h-11 w-11 items-center justify-center rounded-control ${thumbs[step.id] === 'up' ? 'border-2 border-primary text-primary' : ''}`}
            >
              <ThumbsUp className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-pressed={thumbs[step.id] === 'down'}
              aria-label="This step was not useful"
              onClick={() => {
                thumb('step', step.id, 'down');
              }}
              className={`flex h-11 w-11 items-center justify-center rounded-control ${thumbs[step.id] === 'down' ? 'border-2 border-primary text-primary' : ''}`}
            >
              <ThumbsDown className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
      <StickyActionBar
        {...(canCheck
          ? { label: 'Start checkpoint', to: checkpointHref(path.id, step.id) }
          : next
            ? { label: `Next: Step ${next.n}`, to: stepHref(path.id, next.id) }
            : { label: 'Back to path', to: `/paths/${encodeURIComponent(path.id)}` })}
      />
    </>
  );
}

/** US-04, US-07, US-08: one step of the SOP, read from the cached path (PRD-UI §3). */
export default function StepPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const { path, isPending, noPath } = useRoutedPath(params.get('path'));

  return (
    <main>
      {noPath ? (
        <div className="p-6">
          <StateMessage
            title="Step not found"
            action={
              <Link to="/today" className="font-semibold text-primary underline">
                Back to Today
              </Link>
            }
          >
            This step is not part of an active path.
          </StateMessage>
        </div>
      ) : (
        <AsyncView
          query={{ ...path, isPending }}
          label="this step"
          skeleton={<StepSkeleton />}
        >
          {(data) => {
            const step = findStep(data, id);
            return step ? (
              <StepView path={data} step={step} />
            ) : (
              <div className="p-6">
                <StateMessage
                  title="Step not found"
                  action={
                    <Link to={`/paths/${encodeURIComponent(data.id)}`} className="font-semibold text-primary underline">
                      Back to path
                    </Link>
                  }
                >
                  This step is not in your path any more.
                </StateMessage>
              </div>
            );
          }}
        </AsyncView>
      )}
    </main>
  );
}
