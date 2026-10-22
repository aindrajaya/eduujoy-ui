/**
 * Runs `task` once the first paint has settled (`delayMs`) and the browser is idle, so it never
 * competes with a screen's LCP (PRD-UI §9). Returns a cancel function.
 */
export function afterFirstPaint(task: () => void, delayMs = 1000): () => void {
  let idle: number | undefined;
  const timer = setTimeout(() => {
    if ('requestIdleCallback' in window) idle = window.requestIdleCallback(task);
    else task();
  }, delayMs);
  return () => {
    clearTimeout(timer);
    if (idle !== undefined) window.cancelIdleCallback(idle);
  };
}
