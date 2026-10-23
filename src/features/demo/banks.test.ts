import { describe, expect, it } from 'vitest';
import { ALL_BANKS } from '@/test/demoBanks';
import { BLOOMS, isCorrect, toQuestion } from './bank';
import { demoTopics, loadBank } from './banks';
import index from './data/index.json';

describe('/demo topics (UD2)', () => {
  it('lists only fully reviewed banks: the catalog topics wait for the user’s spot check', () => {
    for (const entry of index) {
      const bank = ALL_BANKS.find((b) => b.topic.id === entry.id);
      expect(bank, entry.id).toBeDefined();
      expect(entry.reviewed, entry.id).toBe(bank?.items.every((i) => i.reviewed));
    }
    expect(demoTopics.map((t) => t.id)).toEqual(index.filter((e) => e.reviewed).map((e) => e.id));
    expect(demoTopics.every((t) => t.reviewed)).toBe(true);
  });

  it('loads each bank lazily by id and rejects an unknown one', async () => {
    for (const b of ALL_BANKS) expect((await loadBank(b.topic.id)).topic.id).toBe(b.topic.id);
    await expect(loadBank('nope')).rejects.toThrow('No demo bank');
  });

  it.each(ALL_BANKS.map((b) => [b.topic.id, b] as const))('%s: 18 items, 3 per Bloom level, keys on real options', (_id, bank) => {
    expect(bank.items).toHaveLength(18);
    for (const bloom of BLOOMS) expect(bank.items.filter((i) => i.bloom === bloom)).toHaveLength(3);
    expect(new Set(bank.items.map((i) => i.id)).size).toBe(18);
    for (const i of bank.items) {
      expect(i.explanation.length, i.id).toBeGreaterThan(20);
      expect(i.explanation, i.id).not.toMatch(/wrong/i);
      if (i.type === 'single_choice' || i.type === 'scenario') {
        expect(i.options.map((o) => o.id), i.id).toContain(i.answer);
        expect(isCorrect(i, { optionIds: [i.answer] }), i.id).toBe(true);
      }
      if (i.type === 'multi_choice') {
        expect(i.answer.every((a) => i.options.some((o) => o.id === a)), i.id).toBe(true);
        expect(isCorrect(i, { optionIds: [...i.answer].reverse() }), i.id).toBe(true);
        expect(isCorrect(i, { optionIds: i.answer.slice(0, -1) }), i.id).toBe(i.answer.length === 0);
        expect(toQuestion(i).kind).toBe('multi_choice');
      }
    }
  });

  it('catalog banks carry their export rule, seed and chosen ids, and no sources or next steps', () => {
    for (const bank of ALL_BANKS.filter((b) => b.origin === 'catalog')) {
      const meta = (bank as unknown as { export: { rule: string; seed: number; ids: string[] } }).export;
      expect(meta.rule).toBe('resolved');
      expect(meta.seed).toBe(2026);
      expect(meta.ids).toEqual(bank.items.map((i) => i.id));
      expect(bank.nextSteps).toBeUndefined();
      expect(bank.items.every((i) => i.source === undefined)).toBe(true);
    }
  });
});
