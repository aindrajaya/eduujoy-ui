import { ArrowRight, CircleCheck, Gauge } from 'lucide-react';
import { Link } from 'react-router';
import type { Placement } from '@/api/types';
import { BLOOM_LABEL, formatConfidence, STAGE_LABEL } from '@/lib/levels';
import ErrorNote from '@/ui/ErrorNote';
import StageBadge from '@/ui/sketch/StageBadge';

export interface PlacementResultProps {
  placement: Placement;
  topicName?: string;
  onBuildPath: () => void;
  building?: boolean;
  errorMessage?: string;
  /** Path building is not live on the API yet (POST /v1/paths 404): no button, just where to go. */
  buildingUnavailable?: boolean;
}

/** US-02 result: stage, Bloom level, confidence and the one-line reason, then build the path. */
export default function PlacementResult({
  placement,
  topicName,
  onBuildPath,
  building = false,
  errorMessage,
  buildingUnavailable = false,
}: PlacementResultProps) {
  const { stage, bloom } = placement.position;
  return (
    <section aria-labelledby="placement-title" className="space-y-6">
      <div>
        <p className="flex items-center gap-2 font-semibold text-success">
          <CircleCheck className="h-5 w-5" aria-hidden="true" />
          Diagnostic complete
        </p>
        <h1 id="placement-title" className="mt-1 text-3xl text-text">
          You’re at {STAGE_LABEL[stage]}
          {topicName ? ` in ${topicName}` : ''}
        </h1>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-card border-2 border-ink bg-surface p-4">
          <dt className="text-sm text-text-muted">Stage</dt>
          <dd className="mt-1">
            <StageBadge stage={stage} />
          </dd>
        </div>
        <div className="rounded-card border-2 border-ink bg-surface p-4">
          <dt className="text-sm text-text-muted">Thinking level</dt>
          <dd className="text-lg font-semibold text-text">
            {BLOOM_LABEL[bloom]} <span className="text-sm font-normal text-text-muted">({bloom})</span>
          </dd>
        </div>
        <div className="rounded-card border-2 border-ink bg-surface p-4">
          <dt className="text-sm text-text-muted">Confidence</dt>
          <dd className="flex items-center gap-2 text-lg font-semibold text-text">
            <Gauge className="h-5 w-5 text-primary" aria-hidden="true" />
            {formatConfidence(placement.confidence)}
          </dd>
        </div>
      </dl>

      <p className="rounded-card border-2 border-ink bg-surface p-4 text-text">
        <span className="font-semibold">Why: </span>
        {placement.reason}
      </p>

      {buildingUnavailable ? (
        <div role="status" className="space-y-3 rounded-card border-2 border-primary bg-surface p-4 text-text">
          <p className="font-semibold">Path building is coming soon. Your placement is saved.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/progress" className="inline-flex min-h-11 items-center font-semibold text-primary underline">
              See your progress
            </Link>
            <Link to="/today" className="inline-flex min-h-11 items-center font-semibold text-primary underline">
              Go to Today
            </Link>
          </div>
        </div>
      ) : (
        <>
          {errorMessage && (
            <ErrorNote>
              {errorMessage}
            </ErrorNote>
          )}

          <button
            type="button"
            onClick={onBuildPath}
            disabled={building}
            className="sk-btn sk-btn-primary min-h-12 w-full"
          >
            {building ? 'Starting your path…' : 'Build my path'}
            {!building && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
          </button>
        </>
      )}
    </section>
  );
}
