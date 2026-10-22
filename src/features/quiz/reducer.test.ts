import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/errors';
import { createQuizState, quizReducer, toSnapshot, type QuizAction, type QuizState } from './reducer';

const base = () => createQuizState('quiz-1', 3, 'key-1');
const run = (state: QuizState, ...actions: QuizAction[]) => actions.reduce(quizReducer, state);
const error = new ApiError({ status: 0, code: 'NETWORK_ERROR', title: 'offline' });

describe('createQuizState', () => {
  it('starts answering the first question with a fresh key', () => {
    expect(base()).toMatchObject({ quizId: 'quiz-1', count: 3, index: 0, status: 'answering', idempotencyKey: 'key-1' });
    expect(createQuizState('q', 1).idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('COMMIT', () => {
  it('stores the answer and advances', () => {
    const s = run(base(), { type: 'COMMIT', questionId: 'a', answer: { optionIds: ['x'] } });
    expect(s.index).toBe(1);
    expect(s.answers).toEqual({ a: { optionIds: ['x'] } });
  });

  it('keeps an ordered answer (C6 order blocks) and a linked pair (C5) exactly as committed', () => {
    const s = run(
      base(),
      { type: 'COMMIT', questionId: 'a', answer: { optionIds: ['z', 'x', 'y'] } },
      { type: 'COMMIT', questionId: 'b', answer: { optionIds: ['b-2', 'r-1'] } },
    );
    expect(s.answers).toEqual({ a: { optionIds: ['z', 'x', 'y'] }, b: { optionIds: ['b-2', 'r-1'] } });
  });

  it('on the last question opens review instead of advancing', () => {
    const s = run(base(), { type: 'GO_TO', index: 2 }, { type: 'COMMIT', questionId: 'c', answer: { text: 'hi' } });
    expect(s).toMatchObject({ index: 2, status: 'reviewing' });
  });

  it('while reviewing, editing a question returns to answering', () => {
    const s = run(base(), { type: 'REVIEW' }, { type: 'COMMIT', questionId: 'a', answer: { skipped: true } });
    expect(s).toMatchObject({ index: 1, status: 'answering' });
  });
});

describe('GO_TO', () => {
  it('clamps to the question range', () => {
    expect(run(base(), { type: 'GO_TO', index: 9 }).index).toBe(2);
    expect(run(base(), { type: 'GO_TO', index: -4 }).index).toBe(0);
  });

  it('leaves review or error for answering', () => {
    expect(run(base(), { type: 'REVIEW' }, { type: 'GO_TO', index: 1 }).status).toBe('answering');
    expect(run(base(), { type: 'SUBMIT' }, { type: 'FAILED', error }, { type: 'GO_TO', index: 0 }).status).toBe('answering');
  });

  it('handles an empty quiz', () => {
    expect(quizReducer(createQuizState('q', 0, 'k'), { type: 'GO_TO', index: 3 }).index).toBe(0);
  });
});

describe('TOGGLE_FLAG', () => {
  it('adds then removes a flag without mutating the old state', () => {
    const before = base();
    const flagged = quizReducer(before, { type: 'TOGGLE_FLAG', questionId: 'b' });
    expect([...flagged.flagged]).toEqual(['b']);
    expect(before.flagged.size).toBe(0);
    expect(quizReducer(flagged, { type: 'TOGGLE_FLAG', questionId: 'b' }).flagged.size).toBe(0);
  });
});

describe('submission', () => {
  it('SUBMIT → SUBMITTED keeps the key', () => {
    const s = run(base(), { type: 'SUBMIT' });
    expect(s).toMatchObject({ status: 'submitting', idempotencyKey: 'key-1' });
    expect(run(s, { type: 'SUBMITTED' }).status).toBe('submitted');
  });

  it('SUBMIT → FAILED stores the error; a retry reuses the key and clears it', () => {
    const failed = run(base(), { type: 'SUBMIT' }, { type: 'FAILED', error });
    expect(failed).toMatchObject({ status: 'error', error });
    expect(run(failed, { type: 'SUBMIT' })).toMatchObject({ status: 'submitting', error: null, idempotencyKey: 'key-1' });
  });

  it('SUBMITTED and FAILED are ignored unless submitting', () => {
    const s = base();
    expect(quizReducer(s, { type: 'SUBMITTED' })).toBe(s);
    expect(quizReducer(s, { type: 'FAILED', error })).toBe(s);
  });

  it('locks answers and navigation while submitting and after submit', () => {
    for (const locked of [run(base(), { type: 'SUBMIT' }), run(base(), { type: 'SUBMIT' }, { type: 'SUBMITTED' })]) {
      for (const action of [
        { type: 'COMMIT', questionId: 'a', answer: { text: 'x' } },
        { type: 'GO_TO', index: 1 },
        { type: 'TOGGLE_FLAG', questionId: 'a' },
        { type: 'REVIEW' },
        { type: 'SUBMIT' },
      ] satisfies QuizAction[]) {
        expect(quizReducer(locked, action)).toBe(locked);
      }
    }
  });
});

describe('RESTORE', () => {
  it('restores a draft snapshot (clamped) into a fresh attempt', () => {
    const draft = run(
      base(),
      { type: 'COMMIT', questionId: 'a', answer: { optionIds: ['x'] } },
      { type: 'TOGGLE_FLAG', questionId: 'a' },
    );
    const restored = quizReducer(createQuizState('quiz-1', 3, 'new-key'), {
      type: 'RESTORE',
      snapshot: { ...toSnapshot(draft), index: 7 },
    });
    expect(restored).toMatchObject({ index: 2, answers: { a: { optionIds: ['x'] } }, idempotencyKey: 'key-1' });
    expect([...restored.flagged]).toEqual(['a']);
  });

  it('keeps current values for missing snapshot fields', () => {
    const s = base();
    const restored = quizReducer(s, { type: 'RESTORE', snapshot: {} });
    expect(restored).toMatchObject({ index: 0, answers: {}, idempotencyKey: 'key-1' });
    expect(restored.flagged).toBe(s.flagged);
  });

  it('is ignored once the learner has moved on to review or submit', () => {
    const reviewing = run(base(), { type: 'REVIEW' });
    expect(quizReducer(reviewing, { type: 'RESTORE', snapshot: { index: 1 } })).toBe(reviewing);
  });
});
