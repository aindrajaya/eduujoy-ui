import { afterEach, describe, expect, it } from 'vitest';
import type { Answer } from '@/features/quiz/types';
import { isCorrect, learningScience as bank } from './bank';
import { createLocalDiagnosticAdapter, DemoAttemptNotFound, type DemoState } from './localAdapter';
import type { DemoSelfReport } from './placement';

const selfReport: DemoSelfReport = { years: 'under1', plannedOthers: false };

/** A seeded generator, so a "random" run is reproducible. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

function adapter(seed = 1) {
  let n = 0;
  return createLocalDiagnosticAdapter({ bank, rng: seeded(seed), latencyMs: [0, 0], newId: () => `attempt-${String((n += 1))}` });
}

/** Answers a batch: right with probability `skill`, else "I don't know yet" or a wrong option. */
function answer(state: DemoState, choose: (itemId: string) => boolean): Record<string, Answer> {
  return Object.fromEntries(
    state.items.map((q): [string, Answer] => {
      const item = bank.items.find((i) => i.id === q.id);
      if (!item) throw new Error(q.id);
      if (!choose(q.id)) return [q.id, { skipped: true }];
      const right: string[] =
        item.type === 'linked_choice' ? item.answer : item.type === 'order' ? solveOrder(item.id) : [item.answer];
      expect(isCorrect(item, { optionIds: right })).toBe(true);
      return [q.id, { optionIds: right }];
    }),
  );
}

const SOLUTIONS: Record<string, string[]> = {
  'c6-week-plan': ['a-learn', 'b-learn', 'a-test', 'c-learn', 'b-test', 'c-test', 'mixed', 'mock'],
  'c6-self-test-session': ['close', 'write', 'answer', 'check', 'mark', 'plan'],
  'c6-mixed-set': ['cyl-1', 'cone-1', 'sph-1', 'pri-1', 'cyl-2', 'cone-2', 'sph-2', 'pri-2'],
};
const solveOrder = (id: string) => SOLUTIONS[id] ?? [];

afterEach(() => {
  window.localStorage.clear();
});

describe('LocalDiagnosticAdapter (PRD-UI §7b)', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('a full run takes 8–12 items and ends in a placement (seed %i)', async (seed) => {
    const port = adapter(seed);
    const rng = seeded(seed * 7);
    let state = await port.start(selfReport);
    for (let batch = 1; state.status === 'in_progress'; batch += 1) {
      expect(state.items.length).toBeGreaterThan(0);
      expect(state.items.length).toBeLessThanOrEqual(4);
      state = await port.submitAnswers(state.id, state.items, answer(state, () => rng() < 0.6), `key-${String(batch)}`);
    }
    expect(state.graded.length).toBeGreaterThanOrEqual(8);
    expect(state.graded.length).toBeLessThanOrEqual(12);
    expect(new Set(state.graded.map((g) => g.itemId)).size).toBe(state.graded.length);
    expect(state.placement?.stage).toBeDefined();
  });

  it('all right lands at C6 Expert; nothing known lands at "Start at C1"', async () => {
    for (const [choose, verified, stage] of [
      [() => true, 'C6', 'expert'],
      [() => false, null, 'novice'],
    ] as const) {
      const port = adapter();
      let state = await port.start(selfReport);
      for (let k = 0; state.status === 'in_progress'; k += 1) {
        state = await port.submitAnswers(state.id, state.items, answer(state, choose), `k${String(k)}`);
      }
      expect(state.placement).toMatchObject({ verified, stage });
      port.reset();
    }
  });

  it('a repeated idempotency key replays the first result, even while the first is in flight', async () => {
    const port = adapter();
    const state = await port.start(selfReport);
    const answers = answer(state, () => true);
    const [a, b] = await Promise.all([
      port.submitAnswers(state.id, state.items, answers, 'same-key'),
      port.submitAnswers(state.id, state.items, answers, 'same-key'),
    ]);
    expect(b).toEqual(a);
    expect(a.graded).toHaveLength(4);
    // Later, the same key still replays, and nothing is graded twice.
    expect((await port.submitAnswers(state.id, state.items, answers, 'same-key')).graded).toHaveLength(4);
  });

  it('a reload resumes the outstanding batch from this browser', async () => {
    const port = adapter();
    const started = await port.start(selfReport);
    const after = await port.submitAnswers(started.id, started.items, answer(started, () => true), 'k1');
    const reloaded = adapter();
    expect(reloaded.currentId()).toBe(started.id);
    await expect(reloaded.load(started.id)).resolves.toEqual(after);
  });

  it('rejects an unknown attempt and answers for a batch that is no longer open', async () => {
    const port = adapter();
    await expect(port.load('nope')).rejects.toBeInstanceOf(DemoAttemptNotFound);
    await expect(port.submitAnswers('nope', [], {}, 'k')).rejects.toBeInstanceOf(DemoAttemptNotFound);
    const state = await port.start(selfReport);
    await port.submitAnswers(state.id, state.items, {}, 'k1');
    await expect(port.submitAnswers(state.id, state.items, {}, 'k2')).rejects.toThrow('no longer open');
  });

  it('reset forgets the attempt, so a retake starts fresh', async () => {
    const port = adapter();
    await port.start(selfReport);
    window.localStorage.setItem('quiz:demo:demo:x:y', '{}');
    window.localStorage.setItem('quiz:u1:diagnostic:1', '{}');
    port.reset();
    expect(port.currentId()).toBeNull();
    expect(window.localStorage.getItem('quiz:demo:demo:x:y')).toBeNull();
    expect(window.localStorage.getItem('quiz:u1:diagnostic:1')).toBe('{}');
  });

  it('counts unanswered items as skipped, never correct', async () => {
    const port = adapter();
    const state = await port.start(selfReport);
    const next = await port.submitAnswers(state.id, state.items, {}, 'k1');
    expect(next.graded.every((g) => g.skipped && !g.correct)).toBe(true);
  });
});
