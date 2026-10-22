import type { Answer, QuizQuestion } from './types';

/** One-line answer summary for the review list. */
export function answerSummary(question: QuizQuestion, answer: Answer | undefined): string {
  if (!answer) return 'Not answered';
  if (answer.skipped) return 'Skipped';
  if (answer.optionIds?.length) {
    const options = question.options ?? question.parts?.flatMap((part) => part.options) ?? [];
    const labels = answer.optionIds.map((id) => options.find((o) => o.id === id)?.label ?? id);
    return labels.join(question.kind === 'order' ? ' → ' : ', ');
  }
  return answer.text ?? 'Not answered';
}
