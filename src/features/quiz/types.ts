// Shared by the diagnostic (U6), checkpoints (U9) and the public demo (UD). Most kinds come from
// DiagnosticItem and CheckpointItem; `linked_choice` and `order` are the demo's C5 and C6 items
// (PRD-UI §7b) and are not in the API contract.
export type QuestionKind =
  | 'single_choice'
  | 'multi_choice'
  | 'short_answer'
  | 'scenario'
  | 'open'
  | 'linked_choice'
  | 'order';

export interface QuizOption {
  id: string;
  label: string;
}

export interface QuizQuestion {
  id: string;
  kind: QuestionKind;
  prompt: string;
  /** Choice kinds: the options. `order`: the blocks, in the order they are first shown. */
  options?: QuizOption[];
  /** `linked_choice`: single-choice parts answered together; option ids are unique across parts. */
  parts?: { id: string; prompt: string; options: QuizOption[] }[];
}

/**
 * One committed answer; maps onto DiagnosticAnswer and CheckpointAnswer. `linked_choice` stores one
 * option id per part, in part order; `order` stores every block id in the arranged order.
 */
export interface Answer {
  optionIds?: string[];
  text?: string;
  skipped?: boolean;
}

export type QuizStatus = 'answering' | 'reviewing' | 'submitting' | 'submitted' | 'error';
