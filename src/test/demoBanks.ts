import type { Bank } from '@/features/demo/bank';
import algebraJson from '@/features/demo/data/algebra.json';
import learningScienceJson from '@/features/demo/data/learning-science.json';
import publicSpeakingJson from '@/features/demo/data/public-speaking.json';
import pythonJson from '@/features/demo/data/python.json';

// The /demo banks for tests, loaded eagerly (the app loads each one lazily, banks.ts).
export const learningScience = learningScienceJson as Bank;
export const python = pythonJson as Bank;
export const publicSpeaking = publicSpeakingJson as Bank;
export const algebra = algebraJson as Bank;
export const ALL_BANKS = [learningScience, python, publicSpeaking, algebra];
