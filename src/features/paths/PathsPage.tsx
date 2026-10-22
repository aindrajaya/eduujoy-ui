import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import type { PathSummary } from '@/api/types';
import { STAGE_LABEL } from '@/lib/levels';
import AsyncView from '@/ui/AsyncView';
import { Skeleton } from '@/ui/Skeleton';
import StateMessage from '@/ui/StateMessage';
import PathBuildingSoon from './components/PathBuildingSoon';
import { isPathBuildingClosed, usePaths } from './pathQueries';

const STATUS: Record<PathSummary['status'], string> = {
  active: 'Active',
  generating: 'Being built',
  completed: 'Completed',
  failed: 'Could not be built',
  under_review: 'Being checked',
};

/** All of the learner's paths (PRD-UI §3). */
export default function PathsPage() {
  const query = usePaths();
  return (
    <div className="animate-fade-in p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold text-text md:text-3xl">Your Paths</h1>
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
                  className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="min-w-0">
                    <span className="block font-bold text-text">{p.topic.canonicalName}</span>
                    <span className="text-sm text-text-muted">
                      {STATUS[p.status]} · {STAGE_LABEL[p.from.stage]} → {STAGE_LABEL[p.to.stage]}
                      {p.stepsTotal ? ` · ${p.stepsDone ?? 0} of ${p.stepsTotal} steps` : ''}
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
