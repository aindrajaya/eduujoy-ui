import { describe, expect, it } from 'vitest';
import type { BloomLevel } from '@/api/types';
import { confidenceOf, inversions, place, tally, verifiedLevel, type DemoSelfReport, type Graded } from './placement';

/** 'C3:110' → three C3 items: right, right, wrong. 'C1:-' → one C1 item, "I don't know yet". */
function answers(...spec: string[]): Graded[] {
  return spec.flatMap((s) => {
    const [bloom, marks] = s.split(':') as [BloomLevel, string];
    return marks.split('').map((m, i) => ({ itemId: `${bloom}-${String(i)}`, bloom, correct: m === '1', skipped: m === '-' }));
  });
}

const none: DemoSelfReport = { years: 'none', plannedOthers: false };
const oneToThree: DemoSelfReport = { years: '1to3', plannedOthers: false };
const threePlus: DemoSelfReport = { years: '3plus', plannedOthers: false };
const mentor: DemoSelfReport = { years: '3plus', plannedOthers: true };
const newMentor: DemoSelfReport = { years: 'under1', plannedOthers: true };

describe('verifiedLevel: highest level ≥ 2/3 (1/1 with one item), every lower asked level ≥ 1/2', () => {
  it.each([
    [['C1:0', 'C2:0', 'C3:0', 'C4:0'], 0],
    [['C1:1', 'C2:0', 'C3:0', 'C4:0'], 1],
    [['C1:1', 'C2:11', 'C3:000', 'C4:0'], 2],
    [['C1:1', 'C2:1', 'C3:110', 'C4:100'], 3],
    [['C1:1', 'C2:1', 'C3:1', 'C4:11', 'C5:11', 'C6:1'], 6],
    // 2 of 3 passes; 1 of 2 does not.
    [['C1:1', 'C2:1', 'C3:101'], 3],
    [['C1:1', 'C2:1', 'C3:10'], 2],
    // C4 passes, but C2 below it is under half: C4 is not verified; C1 is the highest that holds.
    [['C1:1', 'C2:000', 'C3:0', 'C4:11'], 1],
    // A lower level at exactly half still counts.
    [['C1:1', 'C2:10', 'C3:11'], 3],
    // Skipped ("I don't know yet") counts as not correct.
    [['C1:-', 'C2:-', 'C3:-', 'C4:-'], 0],
  ])('%j → C%i', (spec, expected) => {
    expect(verifiedLevel(tally(answers(...spec)))).toBe(expected);
  });
});

describe('confidence', () => {
  it.each([
    // Boundary (verified level) with 2+ items and no inversion.
    [['C1:1', 'C2:11', 'C3:000', 'C4:00'], 'high'],
    // Nothing verified: the boundary is C1, here with 3 items.
    [['C1:000', 'C2:000', 'C3:0', 'C4:0'], 'high'],
    // Boundary asked once.
    [['C1:1', 'C2:1', 'C3:1', 'C4:11', 'C5:11', 'C6:1'], 'low'],
    // One inversion: C3 passed above a failed C2.
    [['C1:1', 'C2:00', 'C3:11', 'C4:00'], 'medium'],
    // Two inversions.
    [['C1:0', 'C2:11', 'C3:11', 'C4:0'], 'low'],
  ])('%j → %s', (spec, expected) => {
    expect(confidenceOf(tally(answers(...spec)))).toBe(expected);
  });

  it('names the inverted levels', () => {
    expect(inversions(tally(answers('C1:0', 'C2:11', 'C3:11', 'C4:0')))).toEqual(['C2', 'C3']);
    expect(inversions(tally(answers('C1:1', 'C2:1')))).toEqual([]);
  });
});

describe('place: stage from the verified level, promoted at most one step by the self-report', () => {
  const at = (level: number) => {
    const levels = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].slice(0, level).map((b) => `${b}:11`);
    return answers(...levels);
  };
  it.each([
    [0, none, null, 'novice', false],
    [0, mentor, null, 'novice', false],
    [1, mentor, 'C1', 'novice', false],
    [2, none, 'C2', 'novice', false],
    [2, oneToThree, 'C2', 'advanced_beginner', true],
    [3, newMentor, 'C3', 'advanced_beginner', false],
    [3, oneToThree, 'C3', 'competent', true],
    [4, oneToThree, 'C4', 'competent', false],
    [4, threePlus, 'C4', 'proficient', true],
    [5, threePlus, 'C5', 'proficient', false],
    [5, mentor, 'C5', 'expert', true],
    [6, none, 'C6', 'expert', false],
  ])('level %i, %j → %s %s (promoted %s)', (level, selfReport, verified, stage, promoted) => {
    const graded = level ? at(level) : answers('C1:00', 'C2:00');
    expect(place(graded, selfReport)).toMatchObject({ verified, stage, promoted });
  });

  it.each([
    [['C1:1', 'C2:1', 'C3:111', 'C4:100'], 'You got 3 of 3 Apply items and 1 of 3 Analyse items.'],
    [['C1:0', 'C2:00'], 'You got 0 of 1 Remember item and 0 of 2 Understand items.'],
    [['C1:1', 'C2:1', 'C3:1', 'C4:11', 'C5:11', 'C6:111'], 'You got 3 of 3 Create items.'],
  ])('reason names the evidence: %j', (spec, reason) => {
    expect(place(answers(...spec), none).reason).toBe(reason);
  });
});
