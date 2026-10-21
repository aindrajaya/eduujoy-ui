import type { Answer, QuizQuestion } from './types';

/** One-line answer summary for the review list. */
export function answerSummary(question: QuizQuestion, answer: Answer | undefined): string {
  if (!answer) return 'Not answered';
  if (answer.skipped) return 'Skipped';
  if (answer.optionIds?.length) {
    const labels = answer.optionIds.map((id) => question.options?.find((o) => o.id === id)?.label ?? id);
    return labels.join(', ');
  }
  return answer.text ?? 'Not answered';
}
