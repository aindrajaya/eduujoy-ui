import type { BloomLevel, DreyfusStage } from '@/api/types';
import type { Answer, QuizOption, QuizQuestion } from '@/features/quiz/types';
// The demo's item banks (PRD-UI §7b, UD2): 18 items per topic, 3 per Bloom level. Learning science
// is hand-written with cited sources; the catalog topics are exported read-only from the API's
// reviewed seed banks (scripts/export-demo-banks.mjs). Each bank is its own lazy chunk (banks.ts).

export const BLOOMS: readonly BloomLevel[] = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
/** C1 → 1 … C6 → 6. */
export const levelOf = (bloom: BloomLevel) => BLOOMS.indexOf(bloom) + 1;
export const bloomAt = (level: number): BloomLevel => BLOOMS[Math.min(6, Math.max(1, level)) - 1] ?? 'C1';

/** C6 grading rules: every rule must hold for the order to count as correct. */
export type OrderRule =
  | { type: 'first' | 'last'; block: string }
  | { type: 'before' | 'immediatelyBefore' | 'gapBefore'; first: string; then: string }
  | { type: 'noAdjacentSameGroup' };

interface ItemBase {
  id: string;
  bloom: BloomLevel;
  prompt: string;
  explanation: string;
  /** A key into the bank's `sources`; catalog items have none (their bank is the source). */
  source?: string;
  /** Content reviewed by the user (master PRD golden-set rule); a bank shows only when all are. */
  reviewed: boolean;
  /** What the result says when the answer is not correct, instead of a generic line. */
  notCorrectFeedback?: string;
}

export type BankItem = ItemBase &
  (
    | { type: 'single_choice' | 'scenario'; options: QuizOption[]; answer: string }
    | { type: 'multi_choice'; options: QuizOption[]; answer: string[] }
    | { type: 'linked_choice'; parts: NonNullable<QuizQuestion['parts']>; answer: string[] }
    | { type: 'order'; options: (QuizOption & { group?: string })[]; rules: OrderRule[] }
  );

export interface Bank {
  topic: { id: string; name: string };
  sources: Record<string, { label: string; url?: string }>;
  items: BankItem[];
  /** The first three steps of a path at the next stage, keyed by the placed stage. Hand-written
   *  banks only: catalog topics show a sign-up link instead (no new unreviewed content). */
  nextSteps?: Record<DreyfusStage, { title: string; bloom: BloomLevel }[]>;
  /** Catalog banks: where the items came from, shown once on the result. */
  origin?: 'catalog';
}

/** What the quiz engine shows: no answers or rules (they stay in the bank). */
export function toQuestion(item: BankItem): QuizQuestion {
  switch (item.type) {
    case 'linked_choice':
      return { id: item.id, kind: 'linked_choice', prompt: item.prompt, parts: item.parts };
    case 'order':
      return { id: item.id, kind: 'order', prompt: item.prompt, options: item.options.map(({ id, label }) => ({ id, label })) };
    case 'multi_choice':
      return { id: item.id, kind: 'multi_choice', prompt: item.prompt, options: item.options };
    default:
      return { id: item.id, kind: 'single_choice', prompt: item.prompt, options: item.options };
  }
}

function orderHolds(rule: OrderRule, order: readonly string[], groupOf: (id: string) => string | undefined): boolean {
  const at = (id: string) => order.indexOf(id);
  switch (rule.type) {
    case 'first':
      return at(rule.block) === 0;
    case 'last':
      return at(rule.block) === order.length - 1;
    case 'before':
      return at(rule.first) < at(rule.then);
    case 'immediatelyBefore':
      return at(rule.then) - at(rule.first) === 1;
    case 'gapBefore':
      return at(rule.then) - at(rule.first) >= 2;
    case 'noAdjacentSameGroup':
      return order.every((id, i) => {
        const group = groupOf(id);
        return i === 0 || group === undefined || group !== groupOf(order[i - 1] ?? '');
      });
  }
}

/** "I don't know yet" (skipped) and missing answers are never correct. */
export function isCorrect(item: BankItem, answer: Answer | undefined): boolean {
  const chosen = answer?.skipped ? undefined : answer?.optionIds;
  if (!chosen?.length) return false;
  switch (item.type) {
    case 'linked_choice':
      return chosen.length === item.answer.length && item.answer.every((id, i) => chosen[i] === id);
    case 'order': {
      const ids = item.options.map((o) => o.id);
      if (chosen.length !== ids.length || !ids.every((id) => chosen.includes(id))) return false;
      const groupOf = (id: string) => item.options.find((o) => o.id === id)?.group;
      return item.rules.every((rule) => orderHolds(rule, chosen, groupOf));
    }
    case 'multi_choice':
      // Exactly the keyed options, in any order.
      return chosen.length === item.answer.length && item.answer.every((id) => chosen.includes(id));
    default:
      return chosen.length === 1 && chosen[0] === item.answer;
  }
}
