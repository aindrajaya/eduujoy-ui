import { useWakingUp } from './useWakingUp';

export const WAKE_UP_TEXT = 'Waking up the server…';

/** Slim banner while a request has been pending for 1.5 s; the API sleeps when idle. */
export default function WakeUpNotice() {
  const waking = useWakingUp();
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center">
      {waking && (
        <p className="mt-2 rounded-chip bg-surface px-4 py-2 text-sm font-medium text-text shadow-lg">
          {WAKE_UP_TEXT} <span className="text-text-muted">This can take a few seconds.</span>
        </p>
      )}
    </div>
  );
}
