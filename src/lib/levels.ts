import type { BloomLevel, DreyfusStage } from '@/api/types';

/** Dreyfus skill stages (master PRD), as learners read them. */
export const STAGE_LABEL: Record<DreyfusStage, string> = {
  novice: 'Novice',
  advanced_beginner: 'Advanced beginner',
  competent: 'Competent',
  proficient: 'Proficient',
  expert: 'Expert',
};

/** Bloom's revised taxonomy levels C1–C6. */
export const BLOOM_LABEL: Record<BloomLevel, string> = {
  C1: 'Remember',
  C2: 'Understand',
  C3: 'Apply',
  C4: 'Analyse',
  C5: 'Evaluate',
  C6: 'Create',
};

export const formatConfidence = (confidence: number) => `${Math.round(confidence * 100)}%`;
