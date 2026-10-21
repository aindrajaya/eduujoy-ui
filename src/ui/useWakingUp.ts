import { useEffect, useState, useSyncExternalStore } from 'react';
import { getPendingSince, subscribeActivity } from '@/api/activity';

export const WAKE_UP_AFTER_MS = 1500;

/** True once API requests have been in flight for `thresholdMs` without a break (PRD-UI §4). */
export function useWakingUp(thresholdMs = WAKE_UP_AFTER_MS): boolean {
  const since = useSyncExternalStore(subscribeActivity, getPendingSince);
  const [slowSince, setSlowSince] = useState<number | null>(null);

  useEffect(() => {
    if (since === null) return;
    const timer = setTimeout(
      () => {
        setSlowSince(since);
      },
      Math.max(0, since + thresholdMs - Date.now()),
    );
    return () => {
      clearTimeout(timer);
    };
  }, [since, thresholdMs]);

  return since !== null && slowSince === since;
}
