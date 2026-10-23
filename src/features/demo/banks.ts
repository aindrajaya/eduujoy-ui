import type { Bank } from './bank';
import index from './data/index.json';

declare global {
  interface Window {
    /** The demo banks loaded so far; set by each bank's module (data/*.ts), a side effect on purpose. */
    __eduujoyDemoBanks?: string[];
  }
}

// UD2: the /demo topics. index.json is small and static (the picker); each bank is its own lazy
// chunk, loaded when the visitor picks its topic (or resumes an attempt on it).

export interface BankEntry {
  id: string;
  name: string;
  /** How a sentence names the topic, when not its full name ("learning science"). */
  shortName?: string;
  summary: string;
  /** True only when every item in the bank is reviewed; others never show in the picker. */
  reviewed: boolean;
}

const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  'learning-science': () => import('./data/learning-science'),
  python: () => import('./data/python'),
  'public-speaking': () => import('./data/public-speaking'),
  algebra: () => import('./data/algebra'),
};

/** The topics a visitor can pick: listed in index.json, with a loader and a fully reviewed bank. */
export const demoTopics = (index as BankEntry[]).filter((t) => t.reviewed && t.id in LOADERS);

export async function loadBank(id: string): Promise<Bank> {
  const load = LOADERS[id];
  if (!load) throw new Error(`No demo bank "${id}"`);
  return (await load()).default as Bank;
}
