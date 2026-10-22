import { describe, expect, it } from 'vitest';
import { BLOOMS, isCorrect, learningScience as bank, toQuestion, type BankItem } from './bank';

const item = (id: string): BankItem => {
  const found = bank.items.find((i) => i.id === id);
  if (!found) throw new Error(`no item ${id}`);
  return found;
};

describe('item bank (PRD-UI §7b)', () => {
  it('has 18 items, 3 per Bloom level, each with an explanation and a known source', () => {
    expect(bank.items).toHaveLength(18);
    for (const bloom of BLOOMS) expect(bank.items.filter((i) => i.bloom === bloom)).toHaveLength(3);
    for (const i of bank.items) {
      expect(i.explanation.length, i.id).toBeGreaterThan(20);
      expect(bank.sources[i.source], i.id).toBeDefined();
    }
    expect(new Set(bank.items.map((i) => i.id)).size).toBe(18);
  });

  it('every answer and rule points at a real option or block', () => {
    for (const i of bank.items) {
      if (i.type === 'linked_choice') {
        expect(i.answer.map((id, n) => i.parts[n]?.options.some((o) => o.id === id)), i.id).toEqual([true, true]);
      } else if (i.type === 'order') {
        const ids = i.options.map((o) => o.id);
        for (const rule of i.rules) {
          const refs = 'block' in rule ? [rule.block] : 'first' in rule ? [rule.first, rule.then] : [];
          for (const ref of refs) expect(ids, `${i.id} rule ${rule.type}`).toContain(ref);
        }
      } else {
        expect(i.options.map((o) => o.id), i.id).toContain(i.answer);
      }
    }
  });

  it('shows learners the question without answers or rules', () => {
    const q = toQuestion(item('c6-week-plan'));
    expect(Object.keys(q).sort()).toEqual(['id', 'kind', 'options', 'prompt']);
    expect(q.kind).toBe('order');
    expect(q.options?.[0]).toEqual({ id: 'a-learn', label: 'Topic A: learn' });
    expect(toQuestion(item('c3-flashcards')).kind).toBe('single_choice');
    expect(toQuestion(item('c5-two-plans')).parts).toHaveLength(2);
  });

  it('every item is reviewed and cites a source in the reference list, with a DOI except the one book chapter', () => {
    for (const i of bank.items) {
      expect(i.reviewed, i.id).toBe(true);
      const source = bank.sources[i.source];
      expect(source, i.id).toBeDefined();
      // Bjork (1994) is a chapter in an MIT Press book and has no DOI.
      if (i.source !== 'bjork1994') expect(source?.url, i.id).toMatch(/^https:\/\/doi\.org\/10\.\d+\//);
    }
  });

  it('no explanation or feedback calls an answer wrong', () => {
    for (const i of bank.items) {
      expect(i.explanation, i.id).not.toMatch(/wrong/i);
      expect(i.notCorrectFeedback ?? '', i.id).not.toMatch(/wrong/i);
    }
  });

  it('the starting order of every C6 item is not already correct', () => {
    for (const i of bank.items.filter((x) => x.type === 'order')) {
      expect(isCorrect(i, { optionIds: toQuestion(i).options?.map((o) => o.id) }), i.id).toBe(false);
    }
  });
});

describe('isCorrect', () => {
  it.each([
    ['c1-retrieval', { optionIds: ['b'] }, true],
    ['c1-retrieval', { optionIds: ['a'] }, false],
    ['c1-retrieval', { skipped: true }, false],
    ['c1-retrieval', undefined, false],
    ['c1-retrieval', { optionIds: ['b', 'a'] }, false],
    ['c5-two-plans', { optionIds: ['which-a', 'why-spaced'] }, true],
    ['c5-two-plans', { optionIds: ['which-a', 'why-time'] }, false],
    ['c5-two-plans', { optionIds: ['which-b', 'why-spaced'] }, false],
    ['c5-two-plans', { optionIds: ['which-a'] }, false],
    // Week plan: learn, come back after a gap, mix, mixed self-test right before the mock.
    ['c6-week-plan', { optionIds: ['a-learn', 'b-learn', 'a-test', 'c-learn', 'b-test', 'c-test', 'mixed', 'mock'] }, true],
    ['c6-week-plan', { optionIds: ['a-learn', 'a-test', 'b-learn', 'c-learn', 'b-test', 'c-test', 'mixed', 'mock'] }, false],
    // The mixed self-test must come after all topic tests (user decision, 22 Oct 2026).
    ['c6-week-plan', { optionIds: ['a-learn', 'b-learn', 'a-test', 'c-learn', 'b-test', 'mixed', 'c-test', 'mock'] }, false],
    ['c6-week-plan', { optionIds: ['b-learn', 'a-learn', 'c-learn', 'b-test', 'a-test', 'c-test', 'mixed', 'mock'] }, true],
    ['c6-week-plan', { optionIds: ['a-learn', 'b-learn', 'a-test', 'c-learn', 'b-test', 'c-test', 'mock', 'mixed'] }, false],
    ['c6-week-plan', { optionIds: ['a-learn', 'b-learn', 'a-test'] }, false],
    ['c6-self-test-session', { optionIds: ['close', 'write', 'answer', 'check', 'mark', 'plan'] }, true],
    ['c6-self-test-session', { optionIds: ['close', 'answer', 'write', 'check', 'mark', 'plan'] }, true],
    ['c6-self-test-session', { optionIds: ['write', 'close', 'answer', 'check', 'mark', 'plan'] }, false],
    ['c6-self-test-session', { optionIds: ['close', 'write', 'check', 'answer', 'mark', 'plan'] }, false],
    ['c6-mixed-set', { optionIds: ['cyl-1', 'cone-1', 'sph-1', 'pri-1', 'cyl-2', 'cone-2', 'sph-2', 'pri-2'] }, true],
    ['c6-mixed-set', { optionIds: ['cyl-1', 'cyl-2', 'cone-1', 'sph-1', 'pri-1', 'cone-2', 'sph-2', 'pri-2'] }, false],
    ['c6-mixed-set', { optionIds: ['cyl-1', 'cone-1', 'sph-1', 'pri-1', 'cyl-2', 'cone-2', 'sph-2', 'other'] }, false],
  ])('%s %j → %s', (id, answer, expected) => {
    expect(isCorrect(item(id), answer)).toBe(expected);
  });
});
