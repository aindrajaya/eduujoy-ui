import { describe, expect, it } from 'vitest';
import type { BloomLevel } from '@/api/types';
import { learningScience as bank } from '@/test/demoBanks';
import type { BankItem } from './bank';
import type { Graded } from './placement';
import { firstBatch, MAX_ITEMS, secondBatch, thirdBatch } from './selector';

const first: () => number = () => 0;
const blooms = (items: BankItem[]) => items.map((i) => i.bloom);
const grade = (items: BankItem[], marks: string): Graded[] =>
  items.map((i, n) => ({ itemId: i.id, bloom: i.bloom, correct: marks[n] === '1', skipped: false }));

describe('adaptive selector (PRD-UI §7b)', () => {
  it('batch 1 asks one item each at C1–C4', () => {
    expect(blooms(firstBatch(bank, first))).toEqual(['C1', 'C2', 'C3', 'C4']);
  });

  it.each([
    // b = highest level passed in batch 1; batch 2 asks b, b+1, b+1, b+2 (clamped), never repeating.
    ['0000', ['C1', 'C1', 'C2', 'C2']], // b=0 → C1,C1,C1,C2; C1 has only 2 unused, so the third moves up
    ['1000', ['C1', 'C2', 'C2', 'C3']],
    ['1100', ['C2', 'C3', 'C3', 'C4']],
    ['1110', ['C3', 'C4', 'C4', 'C5']],
    ['1111', ['C4', 'C5', 'C5', 'C6']],
    ['0001', ['C4', 'C5', 'C5', 'C6']],
  ])('batch 1 marks %s → batch 2 %j', (marks, expected) => {
    const b1 = firstBatch(bank, first);
    const b2 = secondBatch(bank, grade(b1, marks), first);
    expect(blooms(b2)).toEqual(expected);
    expect(new Set([...b1, ...b2].map((i) => i.id)).size).toBe(8);
  });

  it('batch 3 is empty unless confidence is low', () => {
    const b1 = firstBatch(bank, first);
    const g1 = grade(b1, '1100');
    const b2 = secondBatch(bank, g1, first);
    // C2 2/2, C3 0/2, C4 0/1: high confidence.
    expect(thirdBatch(bank, [...g1, ...grade(b2, '1000')], first)).toEqual([]);
  });

  it('batch 3 re-asks the unsettled levels, least-asked first, and never passes 12 items', () => {
    const b1 = firstBatch(bank, first);
    const g1 = grade(b1, '1111');
    const b2 = secondBatch(bank, g1, first);
    // C4 2/2, C5 2/2, C6 1/1: the boundary C6 was asked once, so confidence is low.
    const g2 = [...g1, ...grade(b2, '1111')];
    const b3 = thirdBatch(bank, g2, first);
    expect(blooms(b3)).toEqual(['C6', 'C6']);
    expect(g2.length + b3.length).toBeLessThanOrEqual(MAX_ITEMS);
  });

  it('batch 3 after an inversion also re-asks the failed level below it', () => {
    const graded = [
      { itemId: 'c1-retrieval', bloom: 'C1' as BloomLevel, correct: false, skipped: false },
      { itemId: 'c2-why-spacing', bloom: 'C2' as BloomLevel, correct: true, skipped: false },
      { itemId: 'c2-familiarity', bloom: 'C2' as BloomLevel, correct: true, skipped: false },
      { itemId: 'c3-mock-in-6-days', bloom: 'C3' as BloomLevel, correct: true, skipped: false },
      { itemId: 'c3-after-practice-set', bloom: 'C3' as BloomLevel, correct: true, skipped: false },
      { itemId: 'c4-score-drop', bloom: 'C4' as BloomLevel, correct: false, skipped: false },
      { itemId: 'c4-two-students', bloom: 'C4' as BloomLevel, correct: false, skipped: false },
      { itemId: 'c5-two-plans', bloom: 'C5' as BloomLevel, correct: false, skipped: false },
    ];
    // C2 and C3 passed above a failed C1: two inversions, low confidence. C1 was asked least.
    const b3 = thirdBatch(bank, graded, first);
    expect(blooms(b3)[0]).toBe('C1');
    expect(b3.length).toBeLessThanOrEqual(4);
    expect(b3.every((i) => !graded.some((g) => g.itemId === i.id))).toBe(true);
  });
});
