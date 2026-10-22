import { TriangleAlert } from 'lucide-react';
import { useWakingUp } from './useWakingUp';

export const WAKE_UP_TEXT = 'Waking up the server…';

/** Slim banner while a request has been pending for 1.5 s; the API sleeps when idle. */
export default function WakeUpNotice() {
  const waking = useWakingUp();
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center">
      {waking && (
        <p className="mt-2 flex items-center gap-2 rounded-chip border-2 border-ink bg-surface px-4 py-2 text-sm font-semibold text-text shadow-sm">
          <TriangleAlert className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            {WAKE_UP_TEXT} <span className="font-normal text-text-muted">This can take a few seconds.</span>
          </span>
        </p>
      )}
    </div>
  );
}
