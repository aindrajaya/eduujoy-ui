import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizDispatch, useQuizState } from './context';
import { clearForeignDrafts, draftKey, isSnapshot, readDraft, writeDraft } from './drafts';
import QuizProvider from './QuizProvider';
import type { QuizQuestion } from './types';
import { DRAFT_DEBOUNCE_MS, useQuizDraft } from './useQuizDraft';

const questions: QuizQuestion[] = [
  { id: 'q1', kind: 'short_answer', prompt: 'One?' },
  { id: 'q2', kind: 'short_answer', prompt: 'Two?' },
  { id: 'q3', kind: 'short_answer', prompt: 'Three?' },
];

function setup(userId: string | null = 'u1') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QuizProvider quizId="quiz-1" questions={questions} idempotencyKey="fresh-key">
      {children}
    </QuizProvider>
  );
  return renderHook(
    () => {
      useQuizDraft(userId ?? undefined);
      return { state: useQuizState(), dispatch: useQuizDispatch() };
    },
    { wrapper },
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('drafts', () => {
  it('saves 1 s after the last change, not on every change', () => {
    const { result } = setup();
    act(() => {
      result.current.dispatch({ type: 'COMMIT', questionId: 'q1', answer: { text: 'a' } });
      vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS - 100);
      result.current.dispatch({ type: 'TOGGLE_FLAG', questionId: 'q2' });
    });
    act(() => {
      vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS - 100);
    });
    expect(readDraft('u1', 'quiz-1')?.flagged).toBeUndefined();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(readDraft('u1', 'quiz-1')).toEqual({
      index: 1,
      answers: { q1: { text: 'a' } },
      flagged: ['q2'],
      idempotencyKey: 'fresh-key',
    });
  });

  it('restores a draft on mount (RESTORE), including the earlier attempt key', () => {
    writeDraft('u1', 'quiz-1', { index: 2, answers: { q1: { text: 'saved' } }, flagged: ['q1'], idempotencyKey: 'old-key' });
    const { result } = setup();
    expect(result.current.state).toMatchObject({ index: 2, answers: { q1: { text: 'saved' } }, idempotencyKey: 'old-key' });
  });

  it('clears the draft once the submit is confirmed', () => {
    writeDraft('u1', 'quiz-1', { index: 1 });
    const { result } = setup();
    act(() => {
      result.current.dispatch({ type: 'SUBMIT' });
    });
    act(() => {
      result.current.dispatch({ type: 'SUBMITTED' });
    });
    expect(window.localStorage.getItem(draftKey('u1', 'quiz-1'))).toBeNull();
  });

  it('does nothing without a signed-in user', () => {
    const { result } = setup(null);
    act(() => {
      result.current.dispatch({ type: 'COMMIT', questionId: 'q1', answer: { text: 'a' } });
      vi.advanceTimersByTime(DRAFT_DEBOUNCE_MS);
    });
    expect(Object.keys(window.localStorage)).toEqual([]);
  });

  it('ignores corrupt or malformed drafts', () => {
    window.localStorage.setItem(draftKey('u1', 'quiz-1'), JSON.stringify({ index: 'two', answers: { q1: { text: 5 } } }));
    const { result } = setup();
    expect(result.current.state.index).toBe(0);
  });

  it('removes other users’ drafts when a different user signs in', () => {
    writeDraft('u1', 'a', { index: 1 });
    writeDraft('u2', 'b', { index: 1 });
    window.localStorage.setItem('unrelated', '1');
    clearForeignDrafts('u2');
    expect(readDraft('u1', 'a')).toBeNull();
    expect(readDraft('u2', 'b')).toEqual({ index: 1 });
    expect(window.localStorage.getItem('unrelated')).toBe('1');
  });
});

describe('isSnapshot', () => {
  it.each([
    [{}, true],
    [{ index: 1, flagged: ['a'], answers: { a: { optionIds: ['x'], skipped: false } }, idempotencyKey: 'k' }, true],
    [null, false],
    ['x', false],
    [{ index: 1.5 }, false],
    [{ flagged: [1] }, false],
    [{ answers: null }, false],
    [{ answers: { a: null } }, false],
    [{ answers: { a: { optionIds: [1] } } }, false],
    [{ answers: { a: { skipped: 'yes' } } }, false],
    [{ idempotencyKey: 3 }, false],
  ])('%j → %s', (value, expected) => {
    expect(isSnapshot(value)).toBe(expected);
  });
});
