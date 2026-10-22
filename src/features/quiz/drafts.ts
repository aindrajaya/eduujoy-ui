import { keysWithPrefix, readJson, removeItem, writeJson } from '@/lib/storage';
import type { QuizSnapshot } from './reducer';

const PREFIX = 'quiz:';

/** PRD-UI §7: drafts live under quiz:{userId}:{quizId}. */
export const draftKey = (userId: string, quizId: string) => `${PREFIX}${userId}:${quizId}`;

function isAnswer(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as Record<string, unknown>;
  return (
    (a.optionIds === undefined || (Array.isArray(a.optionIds) && a.optionIds.every((o) => typeof o === 'string'))) &&
    (a.text === undefined || typeof a.text === 'string') &&
    (a.skipped === undefined || typeof a.skipped === 'boolean')
  );
}

export function isSnapshot(value: unknown): value is QuizSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    (s.index === undefined || Number.isInteger(s.index)) &&
    (s.idempotencyKey === undefined || typeof s.idempotencyKey === 'string') &&
    (s.flagged === undefined || (Array.isArray(s.flagged) && s.flagged.every((f) => typeof f === 'string'))) &&
    (s.answers === undefined ||
      (typeof s.answers === 'object' && s.answers !== null && Object.values(s.answers).every(isAnswer)))
  );
}

export const readDraft = (userId: string, quizId: string) => readJson(draftKey(userId, quizId), isSnapshot);
export const writeDraft = (userId: string, quizId: string, snapshot: QuizSnapshot) =>
  writeJson(draftKey(userId, quizId), snapshot);
export const clearDraft = (userId: string, quizId: string) => {
  removeItem(draftKey(userId, quizId));
};

/** When a different user signs in on this device, earlier users' drafts are removed. */
export function clearForeignDrafts(userId: string): void {
  const own = `${PREFIX}${userId}:`;
  for (const key of keysWithPrefix(PREFIX)) if (!key.startsWith(own)) removeItem(key);
}
