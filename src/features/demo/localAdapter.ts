import { keysWithPrefix, readJson, removeItem, writeJson } from '@/lib/storage';
import type { DiagnosticPort } from '@/features/diagnostic/port';
import type { QuizQuestion } from '@/features/quiz/types';
import { isCorrect, toQuestion, type Bank } from './bank';
import { place, type DemoPlacement, type DemoSelfReport, type Graded } from './placement';
import { DEMO_SETUP_KEY, isPrefs, type DemoPrefs } from './prefs';
import { firstBatch, secondBatch, thirdBatch, type Rng } from './selector';

/** What the demo screens see: the outstanding batch, or the placement once complete. */
export interface DemoState {
  id: string;
  status: 'in_progress' | 'completed';
  items: QuizQuestion[];
  progress: { answered: number; estimatedTotal: number };
  selfReport: DemoSelfReport;
  /** Shapes the result screen only; the placement ignores it. */
  prefs: DemoPrefs;
  graded: Graded[];
  placement?: DemoPlacement;
}

/** The "server side" of a demo attempt, kept in this browser only. */
interface StoredAttempt {
  id: string;
  selfReport: DemoSelfReport;
  prefs: DemoPrefs;
  graded: Graded[];
  /** Item ids of the outstanding batch; empty once complete. */
  current: string[];
  batches: number;
  /** Idempotency key → the state that submit returned, replayed on a repeat. */
  replies: Record<string, DemoState>;
}

export const DEMO_ATTEMPT_KEY = 'demo:attempt';
/** The quiz engine's drafts for the demo (useQuizDraft with the user id "demo"). */
export const DEMO_DRAFT_OWNER = 'demo';

const isAttempt = (value: unknown): value is StoredAttempt => {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as Partial<StoredAttempt>;
  return (
    typeof a.id === 'string' &&
    typeof a.selfReport === 'object' &&
    isPrefs(a.prefs) &&
    Array.isArray(a.graded) &&
    Array.isArray(a.current) &&
    typeof a.batches === 'number' &&
    typeof a.replies === 'object'
  );
};

export class DemoAttemptNotFound extends Error {
  constructor() {
    super('This demo attempt is not in this browser');
    this.name = 'DemoAttemptNotFound';
  }
}

export interface LocalAdapterOptions {
  bank: Bank;
  rng?: Rng;
  /** Simulated network latency (PRD-UI §7b: 300–600 ms); tests pass [0, 0]. */
  latencyMs?: [number, number];
  newId?: () => string;
}

export interface LocalDiagnosticAdapter extends DiagnosticPort<DemoState> {
  start: (selfReport: DemoSelfReport, prefs: DemoPrefs) => Promise<DemoState>;
  /** The attempt this browser is on, if any, so /demo can resume after a reload. */
  currentId: () => string | null;
  /** Retake: forgets the attempt (the next one gets a new id and new idempotency keys). */
  reset: () => void;
}

/**
 * The demo's DiagnosticPort (PRD-UI §7b): the API's semantics, in the browser. No request leaves
 * the page. A submit is graded and stored before the simulated latency, so a second call with the
 * same key (a double tap, a retry) replays the first result even while the first is in flight.
 */
export function createLocalDiagnosticAdapter({
  bank,
  rng = Math.random,
  latencyMs = [300, 600],
  newId = () => crypto.randomUUID(),
}: LocalAdapterOptions): LocalDiagnosticAdapter {
  const [minMs, maxMs] = latencyMs;
  const wait = <T,>(value: T) =>
    new Promise<T>((resolve) => {
      setTimeout(() => {
        resolve(value);
      }, minMs + Math.random() * (maxMs - minMs));
    });

  const read = () => readJson(DEMO_ATTEMPT_KEY, isAttempt);
  const save = (attempt: StoredAttempt) => {
    writeJson(DEMO_ATTEMPT_KEY, attempt);
  };
  const byId = (id: string) => bank.items.find((i) => i.id === id);

  function stateOf(attempt: StoredAttempt): DemoState {
    const complete = attempt.current.length === 0;
    const answered = attempt.graded.length;
    return {
      id: attempt.id,
      status: complete ? 'completed' : 'in_progress',
      items: attempt.current.flatMap((id) => {
        const item = byId(id);
        return item ? [toQuestion(item)] : [];
      }),
      // Two batches make the usual 8; a third batch is counted once it is asked.
      progress: { answered, estimatedTotal: attempt.batches > 2 ? answered + attempt.current.length : 8 },
      selfReport: attempt.selfReport,
      prefs: attempt.prefs,
      graded: attempt.graded,
      ...(complete ? { placement: place(attempt.graded, attempt.selfReport) } : {}),
    };
  }

  return {
    start(selfReport, prefs) {
      const items = firstBatch(bank, rng);
      const attempt: StoredAttempt = {
        id: newId(),
        selfReport,
        prefs,
        graded: [],
        current: items.map((i) => i.id),
        batches: 1,
        replies: {},
      };
      save(attempt);
      removeItem(DEMO_SETUP_KEY);
      return wait(stateOf(attempt));
    },

    load(id) {
      const attempt = read();
      if (attempt?.id !== id) return Promise.reject(new DemoAttemptNotFound());
      return wait(stateOf(attempt));
    },

    submitAnswers(id, items, answers, idempotencyKey) {
      const attempt = read();
      if (attempt?.id !== id) return Promise.reject(new DemoAttemptNotFound());
      const replay = attempt.replies[idempotencyKey];
      if (replay) return wait(replay);
      const sent = items.map((i) => i.id);
      if (sent.length !== attempt.current.length || !sent.every((itemId) => attempt.current.includes(itemId))) {
        return Promise.reject(new Error('These answers are for a batch that is no longer open'));
      }

      for (const itemId of attempt.current) {
        const item = byId(itemId);
        if (!item) continue;
        const answer = answers[itemId];
        attempt.graded.push({ itemId, bloom: item.bloom, correct: isCorrect(item, answer), skipped: !answer || Boolean(answer.skipped) });
      }
      const next =
        attempt.batches === 1
          ? secondBatch(bank, attempt.graded, rng)
          : attempt.batches === 2
            ? thirdBatch(bank, attempt.graded, rng)
            : [];
      attempt.current = next.map((i) => i.id);
      if (next.length) attempt.batches += 1;
      const state = stateOf(attempt);
      attempt.replies[idempotencyKey] = state;
      save(attempt);
      return wait(state);
    },

    currentId: () => read()?.id ?? null,

    reset() {
      removeItem(DEMO_ATTEMPT_KEY);
      removeItem(DEMO_SETUP_KEY);
      for (const key of keysWithPrefix(`quiz:${DEMO_DRAFT_OWNER}:`)) removeItem(key);
    },
  };
}
