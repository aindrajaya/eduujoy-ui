import type { BloomLevel, DreyfusStage } from '@/api/types';
import { BLOOM_LABEL } from '@/lib/levels';
import { BLOOMS, bloomAt, levelOf } from './bank';

// The demo's own placement rules (PRD-UI §7b, "Placement"). It is a demo placement: the product's
// real placement comes from the API (A7). Pure functions, table-tested in placement.test.ts.

export type YearsStudying = 'none' | 'under1' | '1to3' | '3plus';

/** Not scored: it only promotes the stage by at most one step. */
export interface DemoSelfReport {
  years: YearsStudying;
  plannedOthers: boolean;
}

/** One answered item, as the placement sees it. */
export interface Graded {
  itemId: string;
  bloom: BloomLevel;
  correct: boolean;
  /** "I don't know yet": not correct, and never called wrong. */
  skipped: boolean;
}

export interface LevelTally {
  asked: number;
  correct: number;
}

export type Confidence = 'high' | 'medium' | 'low';

export interface DemoPlacement {
  /** Null when nothing is verified: the result reads "Start at C1". */
  verified: BloomLevel | null;
  stage: DreyfusStage;
  /** True when the self-report moved the stage up one step. */
  promoted: boolean;
  confidence: Confidence;
  /** Names the evidence, e.g. "You got 3 of 3 Apply items and 1 of 3 Analyse items." */
  reason: string;
  levels: Record<BloomLevel, LevelTally>;
}

export function tally(graded: readonly Graded[]): Record<BloomLevel, LevelTally> {
  const levels = Object.fromEntries(BLOOMS.map((b) => [b, { asked: 0, correct: 0 }])) as Record<BloomLevel, LevelTally>;
  for (const g of graded) {
    levels[g.bloom].asked += 1;
    if (g.correct) levels[g.bloom].correct += 1;
  }
  return levels;
}

/** At least 2/3 correct (so 1/1, 2/2, or 2 or 3 of 3). */
export const passes = (t: LevelTally) => t.asked > 0 && t.correct * 3 >= t.asked * 2;
const atLeastHalf = (t: LevelTally) => t.correct * 2 >= t.asked;

/**
 * The highest level L (1–6) that passes, with every lower level that was asked at least half
 * right; 0 when none qualifies.
 */
export function verifiedLevel(levels: Record<BloomLevel, LevelTally>): number {
  for (let level = 6; level >= 1; level -= 1) {
    const lower = BLOOMS.slice(0, level - 1).map((b) => levels[b]);
    if (passes(levels[bloomAt(level)]) && lower.every((t) => t.asked === 0 || atLeastHalf(t))) return level;
  }
  return 0;
}

/** Levels passed above a failed level, e.g. C4 passed while C2 failed. */
export function inversions(levels: Record<BloomLevel, LevelTally>): BloomLevel[] {
  const failed = BLOOMS.filter((b) => levels[b].asked > 0 && !passes(levels[b])).map(levelOf);
  const lowestFailed = Math.min(...failed);
  return BLOOMS.filter((b) => passes(levels[b]) && levelOf(b) > lowestFailed);
}

/**
 * High when the boundary level (the verified one, or C1 when none is) had 2 or more items and
 * nothing is inverted; medium with one inversion; low otherwise, which triggers batch 3.
 */
export function confidenceOf(levels: Record<BloomLevel, LevelTally>): Confidence {
  const boundary = levels[bloomAt(Math.max(1, verifiedLevel(levels)))];
  const inverted = inversions(levels).length;
  if (boundary.asked >= 2 && inverted === 0) return 'high';
  return inverted === 1 ? 'medium' : 'low';
}

/** The lowest stage whose band contains the level (master PRD §5). */
const BASE_STAGE: Record<number, DreyfusStage> = {
  0: 'novice',
  1: 'novice',
  2: 'novice',
  3: 'advanced_beginner',
  4: 'competent',
  5: 'proficient',
  6: 'expert',
};

const atLeastOneYear = (s: DemoSelfReport) => s.years === '1to3' || s.years === '3plus';

/** The one-step promotion each verified level allows, if the self-report backs it. */
const PROMOTION: Record<number, { to: DreyfusStage; when: (s: DemoSelfReport) => boolean } | undefined> = {
  2: { to: 'advanced_beginner', when: atLeastOneYear },
  3: { to: 'competent', when: atLeastOneYear },
  4: { to: 'proficient', when: (s) => s.years === '3plus' },
  5: { to: 'expert', when: (s) => s.years === '3plus' && s.plannedOthers },
};

const items = (n: number) => (n === 1 ? 'item' : 'items');
const phrase = (t: LevelTally, bloom: BloomLevel) =>
  `${String(t.correct)} of ${String(t.asked)} ${BLOOM_LABEL[bloom]} ${items(t.asked)}`;

function reasonFor(levels: Record<BloomLevel, LevelTally>, verified: number): string {
  const boundary = bloomAt(Math.max(1, verified));
  const above = BLOOMS.find((b) => levelOf(b) > levelOf(boundary) && levels[b].asked > 0);
  const parts = [phrase(levels[boundary], boundary), ...(above ? [phrase(levels[above], above)] : [])];
  return `You got ${parts.join(' and ')}.`;
}

export function place(graded: readonly Graded[], selfReport: DemoSelfReport): DemoPlacement {
  const levels = tally(graded);
  const level = verifiedLevel(levels);
  const promotion = PROMOTION[level];
  const promoted = Boolean(promotion?.when(selfReport));
  return {
    verified: level ? bloomAt(level) : null,
    stage: promoted && promotion ? promotion.to : (BASE_STAGE[level] ?? 'novice'),
    promoted,
    confidence: confidenceOf(levels),
    reason: reasonFor(levels, level),
    levels,
  };
}
