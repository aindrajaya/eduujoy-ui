import { ArrowLeft } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { hasRole, useSession } from '@/auth/session';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center rounded-chip px-4 font-semibold ${isActive ? 'border-2 border-primary bg-surface text-primary' : 'border-2 border-transparent text-text-muted'}`;

/** Header for the staff screens: back to the app, and the screens this role may open. */
export default function AdminNav({ openCount }: { openCount?: number }) {
  const { data: me } = useSession();
  return (
    <header className="space-y-3 border-b border-border p-4 md:px-6">
      <Link to="/account" className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Eduujoy
      </Link>
      <nav aria-label="Admin" className="flex flex-wrap gap-2">
        <NavLink to="/admin/review" className={linkClass}>
          Review queue
          {openCount !== undefined && openCount > 0 && ' '}
          {openCount !== undefined && openCount > 0 && (
            <span className="ml-2 rounded-chip bg-primary px-2 text-xs text-on-primary">
              {openCount} <span className="sr-only">open</span>
            </span>
          )}
        </NavLink>
        {hasRole(me, ['admin']) && (
          <NavLink to="/admin/metrics" className={linkClass}>
            Costs and latency
          </NavLink>
        )}
      </nav>
    </header>
  );
}
