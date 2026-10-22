import { CircleCheck, ChevronRight, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import type { PathStep } from '@/api/types';
import { BLOOM_LABEL } from '@/lib/levels';
import { stepHref } from '../pathQueries';

const STATUS: Record<PathStep['status'], { label: string; className: string }> = {
  completed: { label: 'Done', className: 'border-success text-success' },
  active: { label: 'In progress', className: 'border-primary text-primary' },
  locked: { label: 'Up next', className: 'border-border text-text-muted' },
  skipped: { label: 'Skipped', className: 'border-border text-text-muted' },
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
              className="sk-card flex items-center gap-3 hover:bg-surface-muted"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-ink bg-surface font-bold text-text">
                {step.n}
              </span>
              <span className="min-w-0 flex-1">
                <span className="sk-title block text-text">{step.objective}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-muted">
                  {/* Under the title, so the title keeps the row's width at 360 px. */}
                  <span className={`flex items-center gap-1 rounded-chip border-2 bg-surface px-2 py-0.5 text-xs font-bold ${status.className}`}>
                    {step.status === 'completed' && <CircleCheck className="h-4 w-4" aria-hidden="true" />}
                    {status.label}
                  </span>
                  <span>
                    {step.bloom} · {BLOOM_LABEL[step.bloom]}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{step.estMinutes} min</span>
                  {step.remedial && (
                    <span className="flex items-center gap-1 font-semibold text-warning">
                      <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                      Review step
                    </span>
                  )}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-text-muted" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
