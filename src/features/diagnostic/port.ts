import type { Answer } from '@/features/quiz/types';

/**
 * The seam between the diagnostic screens and where a diagnostic runs (PRD-UI §7b). The API adapter
 * talks to /v1/diagnostics (U6); the local adapter runs the public demo in the browser. Switching
 * adapters changes no screen: both run on the same quiz engine (QuizProvider, reducer, drafts).
 *
 * Both keep one rule: a submit that repeats an idempotency key returns the first result and is
 * not counted twice, so a retry or a double tap can never record a batch twice.
 */
export interface DiagnosticPort<TState, TBatch = TState> {
  /** The outstanding batch, or the result once complete, so a reload resumes where it stopped. */
  load: (diagnosticId: string) => Promise<TState>;
  /** Sends one batch. Every item is sent; an item without an answer counts as skipped. */
  submitAnswers: (
    diagnosticId: string,
    items: readonly { id: string }[],
    answers: Record<string, Answer>,
    idempotencyKey: string,
  ) => Promise<TBatch>;
}
