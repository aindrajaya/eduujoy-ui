// Shared by the diagnostic (U6) and checkpoints (U9). Kinds come from DiagnosticItem and CheckpointItem.
export type QuestionKind = 'single_choice' | 'multi_choice' | 'short_answer' | 'scenario' | 'open';

export interface QuizQuestion {
  id: string;
  kind: QuestionKind;
  prompt: string;
  options?: { id: string; label: string }[];
}

/** One committed answer; maps onto DiagnosticAnswer and CheckpointAnswer. */
export interface Answer {
  optionIds?: string[];
  text?: string;
  skipped?: boolean;
}

export type QuizStatus = 'answering' | 'reviewing' | 'submitting' | 'submitted' | 'error';
