// A tiny toast queue that lives in the shell. The Radix UI that renders it is lazy-loaded on the
// first toast (ToastHost), so the 150 KB initial budget never pays for it (PRD-UI §9).

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Optional single action, e.g. "Retry" or "Open". */
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

export interface Toast extends ToastInput {
  id: string;
}

const MAX_VISIBLE = 3;
let toasts: readonly Toast[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Shows a toast and returns its id. Oldest toasts drop off beyond three. */
export function toast(input: ToastInput): string {
  const id = crypto.randomUUID();
  toasts = [...toasts, { ...input, id }].slice(-MAX_VISIBLE);
  emit();
  return id;
}

export function dismissToast(id: string): void {
  const next = toasts.filter((t) => t.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): readonly Toast[] {
  return toasts;
}

/** Test helper: empties the queue. */
export function resetToasts(): void {
  toasts = [];
  emit();
}
