import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import type { PathStep } from '@/api/types';
import { BLOOM_LABEL } from '@/lib/levels';
import { stepHref } from '../pathQueries';

const STATUS: Record<PathStep['status'], { label: string; className: string }> = {
  completed: { label: 'Done', className: 'bg-success-soft text-success' },
  active: { label: 'In progress', className: 'bg-primary-soft text-primary' },
  locked: { label: 'Up next', className: 'bg-surface-muted text-text-muted' },
  skipped: { label: 'Skipped', className: 'bg-surface-muted text-text-muted' },
};

/** The SOP as a numbered list; status is spelled out, never colour alone. */
export default function StepList({ pathId, steps }: { pathId: string; steps: readonly PathStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step) => {
        const status = STATUS[step.status];
        return (
          <li key={step.id}>
            <Link
              to={stepHref(pathId, step.id)}
              className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-muted font-bold text-text">
                {step.n}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-text">{step.objective}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-muted">
                  <span>
                    {step.bloom} · {BLOOM_LABEL[step.bloom]}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{step.estMinutes} min</span>
                  {step.remedial && <span className="font-semibold text-warning">Review step</span>}
                </span>
              </span>
              <span className={`rounded-chip px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-text-muted" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
