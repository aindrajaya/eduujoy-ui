import { ArrowRight, Gauge } from 'lucide-react';
import type { Placement } from '@/api/types';
import { BLOOM_LABEL, formatConfidence, STAGE_LABEL } from '@/lib/levels';

export interface PlacementResultProps {
  placement: Placement;
  topicName?: string;
  onBuildPath: () => void;
  building?: boolean;
  errorMessage?: string;
}

/** US-02 result: stage, Bloom level, confidence and the one-line reason, then build the path. */
export default function PlacementResult({ placement, topicName, onBuildPath, building = false, errorMessage }: PlacementResultProps) {
  const { stage, bloom } = placement.position;
  return (
    <section aria-labelledby="placement-title" className="space-y-6">
      <div>
        <p className="font-semibold text-success">Diagnostic complete</p>
        <h1 id="placement-title" className="mt-1 text-3xl font-bold text-text">
          You’re at {STAGE_LABEL[stage]}
          {topicName ? ` in ${topicName}` : ''}
        </h1>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-card bg-surface-muted p-4">
          <dt className="text-sm text-text-muted">Stage</dt>
          <dd className="text-lg font-semibold text-text">{STAGE_LABEL[stage]}</dd>
        </div>
        <div className="rounded-card bg-surface-muted p-4">
          <dt className="text-sm text-text-muted">Thinking level</dt>
          <dd className="text-lg font-semibold text-text">
            {BLOOM_LABEL[bloom]} <span className="text-sm font-normal text-text-muted">({bloom})</span>
          </dd>
        </div>
        <div className="rounded-card bg-surface-muted p-4">
          <dt className="text-sm text-text-muted">Confidence</dt>
          <dd className="flex items-center gap-2 text-lg font-semibold text-text">
            <Gauge className="h-5 w-5 text-primary" aria-hidden="true" />
            {formatConfidence(placement.confidence)}
          </dd>
        </div>
      </dl>

      <p className="rounded-card border border-border p-4 text-text">
        <span className="font-semibold">Why: </span>
        {placement.reason}
      </p>

      {errorMessage && (
        <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        onClick={onBuildPath}
        disabled={building}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 px-6 font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
      >
        {building ? 'Starting your path…' : 'Build my path'}
        {!building && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
      </button>
    </section>
  );
}
