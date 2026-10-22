import { BLOOMS, bloomAt, levelOf, type Bank, type BankItem } from './bank';
import { confidenceOf, inversions, passes, tally, verifiedLevel, type Graded } from './placement';

// The demo's adaptive flow (PRD-UI §7b): 8–12 items in batches of up to 4. Pure; `rng` picks among
// a level's unused items, so tests pass a fixed one and every run stays reproducible.

export const MAX_ITEMS = 12;
export type Rng = () => number;

/**
 * An unused item at the level, or at the nearest level that still has one (ties go up, so a
 * missing item is replaced by a harder one rather than an easier one). Null when none is left.
 */
function pick(bank: Bank, used: Set<string>, level: number, rng: Rng): BankItem | null {
  for (let distance = 0; distance < 6; distance += 1) {
    for (const candidate of [level + distance, level - distance]) {
      if (candidate < 1 || candidate > 6) continue;
      const free = bank.items.filter((i) => levelOf(i.bloom) === candidate && !used.has(i.id));
      if (free.length) return free[Math.floor(rng() * free.length)] ?? null;
    }
  }
  return null;
}

function pickAll(bank: Bank, graded: readonly Graded[], levels: number[], rng: Rng): BankItem[] {
  const used = new Set(graded.map((g) => g.itemId));
  const batch: BankItem[] = [];
  for (const level of levels) {
    const item = pick(bank, used, level, rng);
    if (!item) break;
    used.add(item.id);
    batch.push(item);
  }
  return batch;
}

/** Batch 1: one item each at C1, C2, C3 and C4. */
export const firstBatch = (bank: Bank, rng: Rng) => pickAll(bank, [], [1, 2, 3, 4], rng);

/**
 * Batch 2: with b the highest level passed in batch 1 (0 if none), items at b, b+1, b+1 and b+2,
 * clamped to C1–C6, never repeating an item.
 */
export function secondBatch(bank: Bank, graded: readonly Graded[], rng: Rng): BankItem[] {
  const b = Math.max(0, ...graded.filter((g) => g.correct).map((g) => levelOf(g.bloom)));
  const clamp = (level: number) => Math.min(6, Math.max(1, level));
  return pickAll(bank, graded, [b, b + 1, b + 1, b + 2].map(clamp), rng);
}

/**
 * Batch 3, only when confidence is low after batch 2: up to 4 items at the unsettled levels (the
 * boundary level, the one above it, and any inverted level), the least-asked level first. The
 * total never exceeds 12. Empty when confidence is not low or nothing unsettled is left to ask.
 */
export function thirdBatch(bank: Bank, graded: readonly Graded[], rng: Rng): BankItem[] {
  const levels = tally(graded);
  if (confidenceOf(levels) !== 'low') return [];
  const boundary = Math.max(1, verifiedLevel(levels));
  const inverted = inversions(levels).map(levelOf);
  // An inversion also unsettles the failed level below it, so the lowest failed level is re-asked.
  const lowestFailed = BLOOMS.find((b) => levels[b].asked > 0 && !passes(levels[b]));
  const unsettled = new Set([
    boundary,
    Math.min(6, boundary + 1),
    ...inverted,
    ...(inverted.length && lowestFailed ? [levelOf(lowestFailed)] : []),
  ]);

  const used = new Set(graded.map((g) => g.itemId));
  const asked = new Map([...unsettled].map((l) => [l, levels[bloomAt(l)].asked]));
  const batch: BankItem[] = [];
  const room = Math.min(4, MAX_ITEMS - graded.length);
  while (batch.length < room) {
    const open = [...asked.entries()]
      .filter(([l]) => bank.items.some((i) => levelOf(i.bloom) === l && !used.has(i.id)))
      .sort(([la, a], [lb, b]) => a - b || la - lb);
    const level = open[0]?.[0];
    if (level === undefined) break;
    const free = bank.items.filter((i) => levelOf(i.bloom) === level && !used.has(i.id));
    const item = free[Math.floor(rng() * free.length)];
    if (!item) break;
    used.add(item.id);
    asked.set(level, (asked.get(level) ?? 0) + 1);
    batch.push(item);
  }
  return batch;
}
