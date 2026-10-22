import { useEffect, useRef } from 'react';
import { useQuizDispatch, useQuizState } from './context';
import { clearDraft, clearForeignDrafts, readDraft, writeDraft } from './drafts';
import { toSnapshot } from './reducer';

export const DRAFT_DEBOUNCE_MS = 1000;

/**
 * PRD-UI §7: restores the draft on mount, saves it 1 s after the last change, and clears it once
 * the submit is confirmed. Other users' drafts on this device are removed on mount. Session
 * expiry keeps the learner's own draft (PRD-UI §6).
 */
export function useQuizDraft(userId: string | undefined, { clearOthers = true }: { clearOthers?: boolean } = {}): void {
  const state = useQuizState();
  const dispatch = useQuizDispatch();
  const restored = useRef(false);
  const { quizId, status } = state;

  useEffect(() => {
    if (!userId || restored.current) return;
    restored.current = true;
    // A different user on this device: earlier users' drafts go before anything is restored. The
    // public demo (UD) keeps them: a visitor's demo must not delete a signed-in learner's drafts.
    if (clearOthers) clearForeignDrafts(userId);
    const snapshot = readDraft(userId, quizId);
    if (snapshot) dispatch({ type: 'RESTORE', snapshot });
  }, [clearOthers, dispatch, quizId, userId]);

  useEffect(() => {
    if (!userId || !restored.current) return;
    if (status === 'submitted') {
      clearDraft(userId, quizId);
      return;
    }
    const timer = setTimeout(() => {
      writeDraft(userId, quizId, toSnapshot(state));
    }, DRAFT_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [userId, quizId, status, state]);
}
