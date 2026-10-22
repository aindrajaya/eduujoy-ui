import type { HttpClient } from './http';

// In-flight request tracking for the "Waking up the server…" state (PRD-UI §4). The API sleeps
// when idle, so the first request after a quiet spell can take many seconds.

let pending = 0;
let pendingSince: number | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function requestStarted(now = Date.now()): void {
  if (pending === 0) pendingSince = now;
  pending += 1;
  emit();
}

export function requestFinished(): void {
  if (pending === 0) return;
  pending -= 1;
  if (pending === 0) pendingSince = null;
  emit();
}

/** When the current run of in-flight requests began, or null when nothing is in flight. */
export function getPendingSince(): number | null {
  return pendingSince;
}

export function subscribeActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper. */
export function resetActivity(): void {
  pending = 0;
  pendingSince = null;
  emit();
}

/**
 * Counts each request pass on the HTTP client. Install before the auth interceptors so the
 * count drops as soon as a response arrives, even when that response triggers a refresh replay
 * (the replay is its own pass).
 */
export function trackActivity(instance: HttpClient): void {
  instance.interceptors.request.use((config) => {
    requestStarted();
    return config;
  });
  instance.interceptors.response.use(
    (response) => {
      requestFinished();
      return response;
    },
    // The client rejects with HttpError (an Error); the auth interceptors map it next.
    (error: unknown) => {
      requestFinished();
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    },
  );
}
