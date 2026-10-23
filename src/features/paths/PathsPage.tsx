import { ArrowRight, CircleAlert, CircleCheck, CircleDot, Clock, Loader2, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import type { PathSummary } from '@/api/types';
import { STAGE_LABEL } from '@/lib/levels';
import AsyncView from '@/ui/AsyncView';
import { Skeleton } from '@/ui/Skeleton';
import StateMessage from '@/ui/StateMessage';
import PathBuildingSoon from './components/PathBuildingSoon';
import { isPathBuildingClosed } from './buildingClosed';
import { usePaths } from './pathQueries';

// A chip per status: its icon and its word, so the colour never carries it alone (README).
const STATUS: Record<PathSummary['status'], { label: string; icon: LucideIcon; className: string }> = {
  active: { label: 'Active', icon: CircleDot, className: 'border-primary text-primary' },
  generating: { label: 'Being built', icon: Loader2, className: 'border-primary text-primary' },
  completed: { label: 'Completed', icon: CircleCheck, className: 'border-success text-success' },
  failed: { label: 'Could not be built', icon: CircleAlert, className: 'border-danger text-danger' },
  under_review: { label: 'Being checked', icon: Clock, className: 'border-ink text-text' },
};

function StatusChip({ status }: { status: PathSummary['status'] }) {
  const { label, icon: Icon, className } = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-chip border-2 bg-surface px-2 py-0.5 text-xs font-bold ${className}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

/** All of the learner's paths (PRD-UI §3). */
export default function PathsPage() {
  const query = usePaths();
  return (
    <div className="animate-fade-in p-4 md:p-6">
      <h1 className="mb-6 text-text md:text-3xl">Your paths</h1>
      {isPathBuildingClosed(query.error) ? (
        <PathBuildingSoon />
      ) : (
      <AsyncView
        query={query}
        label="your paths"
        skeleton={
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-card" />
            ))}
          </div>
        }
        isEmpty={(paths) => paths.length === 0}
        empty={
          <StateMessage
            title="No paths yet"
            action={
              <Link to="/start" className="font-semibold text-primary underline">
                Start a learning path
              </Link>
            }
          >
            Your learning paths will appear here.
          </StateMessage>
        }
      >
        {(paths) => (
          <ul className="space-y-4">
            {paths.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/paths/${encodeURIComponent(p.id)}`}
                  className="sk-card flex items-center justify-between gap-3 hover:bg-surface-muted"
                >
                  <span className="min-w-0">
                    <span className="sk-title block text-text">{p.topic.canonicalName}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-muted">
                      <StatusChip status={p.status} />
                      <span>
                        {STAGE_LABEL[p.from.stage]} → {STAGE_LABEL[p.to.stage]}
                        {p.stepsTotal ? ` · ${p.stepsDone ?? 0} of ${p.stepsTotal} steps` : ''}
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AsyncView>
      )}
    </div>
  );
}
