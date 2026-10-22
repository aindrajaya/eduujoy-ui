import { Flag } from 'lucide-react';
import { memo, useId, useState, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import OrderList from './OrderList';
import type { Answer, QuizQuestion } from './types';

interface FormValues {
  choice: string;
  choices: string[];
  /** linked_choice: one option id per part. */
  parts: string[];
  text: string;
}

export interface QuestionViewProps {
  question: QuizQuestion;
  position: number;
  total: number;
  defaultAnswer?: Answer;
  flagged: boolean;
  allowSkip?: boolean;
  /** Label of the button on the last question. */
  finalLabel?: string;
  /** Label of the skip action, e.g. "I don't know yet" in the demo (PRD-UI §4b learning rules). */
  skipLabel?: string;
  onCommit: (questionId: string, answer: Answer) => void;
  onBack?: () => void;
  onToggleFlag: (questionId: string) => void;
}

const isChoice = (q: QuizQuestion) => q.kind === 'single_choice' || q.kind === 'multi_choice';

function toAnswer(question: QuizQuestion, values: FormValues, order: string[]): Answer | null {
  if (question.kind === 'single_choice') return values.choice ? { optionIds: [values.choice] } : null;
  if (question.kind === 'multi_choice') return values.choices.length ? { optionIds: values.choices } : null;
  if (question.kind === 'order') return { optionIds: order };
  if (question.kind === 'linked_choice') {
    const parts = question.parts ?? [];
    const chosen = parts.map((_, i) => values.parts[i] ?? '');
    return parts.length && chosen.every(Boolean) ? { optionIds: chosen } : null;
  }
  const text = values.text.trim();
  return text ? { text } : null;
}

function missingMessage(question: QuizQuestion): string {
  if (question.kind === 'linked_choice') return 'Answer both parts to continue.';
  return isChoice(question) ? 'Choose an answer to continue.' : 'Write an answer to continue.';
}

/**
 * One question at a time (PRD-UI §7). Typing re-renders only this uncontrolled form; the answer
 * reaches the quiz reducer on "Next" (COMMIT), never per keystroke.
 */
function QuestionView({
  question,
  position,
  total,
  defaultAnswer,
  flagged,
  allowSkip = false,
  finalLabel = 'Review answers',
  skipLabel = 'Skip',
  onCommit,
  onBack,
  onToggleFlag,
}: QuestionViewProps) {
  const promptId = useId();
  const errorId = useId();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      choice: defaultAnswer?.optionIds?.[0] ?? '',
      choices: defaultAnswer?.optionIds ?? [],
      parts: question.kind === 'linked_choice' ? (defaultAnswer?.optionIds ?? []) : [],
      text: defaultAnswer?.text ?? '',
    },
  });
  // `order` is a controlled list: its buttons reorder it, and "Next" commits the current order.
  const [order, setOrder] = useState<string[]>(() => {
    const ids = (question.options ?? []).map((o) => o.id);
    const saved = defaultAnswer?.optionIds;
    return saved?.length === ids.length && ids.every((id) => saved.includes(id)) ? saved : ids;
  });

  const submit = handleSubmit((values) => {
    const answer = toAnswer(question, values, order);
    if (!answer) {
      setError('root', { message: missingMessage(question) });
      return;
    }
    onCommit(question.id, answer);
  });

  // In text answers, Enter is a new line; Ctrl/⌘ + Enter moves on.
  const onTextKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void submit();
    }
  };

  const error = errors.root?.message;
  const multi = question.kind === 'multi_choice';

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-6" aria-labelledby={promptId}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-semibold text-text-muted">
          Question {position} of {total}
        </p>
        <button
          type="button"
          aria-pressed={flagged}
          onClick={() => {
            onToggleFlag(question.id);
          }}
          className={`quiz-action quiz-action-ghost flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-semibold ${
            flagged ? 'bg-warning-soft text-warning' : 'text-text-muted hover:text-text'
          }`}
        >
          <Flag className="h-4 w-4" aria-hidden="true" />
          {flagged ? 'Flagged' : 'Flag for review'}
        </button>
      </div>

      <h2 id={promptId} className="text-xl font-semibold whitespace-pre-line text-text">
        {question.prompt}
      </h2>

      {question.kind === 'order' ? (
        <OrderList order={order} options={question.options ?? []} labelledBy={promptId} onChange={setOrder} />
      ) : question.kind === 'linked_choice' ? (
        <div className="space-y-6">
          {(question.parts ?? []).map((part, i) => (
            <fieldset key={part.id} className="space-y-3" aria-describedby={error ? errorId : undefined}>
              <legend className="mb-3 text-base font-semibold text-text">{part.prompt}</legend>
              {part.options.map((option) => (
                <label
                  key={option.id}
                  className="quiz-option flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 border-border p-4 has-checked:border-primary has-checked:bg-primary-soft"
                >
                  <input type="radio" value={option.id} className="h-4 w-4 accent-primary" {...register(`parts.${i}`)} />
                  <span className="text-base text-text">{option.label}</span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      ) : isChoice(question) ? (
        <fieldset aria-labelledby={promptId} aria-describedby={error ? errorId : undefined}>
          <div className="space-y-3">
            {(question.options ?? []).map((option) => (
              <label
                key={option.id}
                className="quiz-option flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 border-border p-4 has-checked:border-primary has-checked:bg-primary-soft"
              >
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  value={option.id}
                  className="h-4 w-4 accent-primary"
                  {...register(multi ? 'choices' : 'choice')}
                />
                <span className="text-base text-text">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <div>
          <label htmlFor={`${promptId}-text`} className="sr-only">
            Your answer
          </label>
          <textarea
            id={`${promptId}-text`}
            rows={question.kind === 'open' ? 8 : 4}
            onKeyDown={onTextKeyDown}
            aria-describedby={error ? errorId : `${promptId}-hint`}
            className="quiz-field w-full rounded-xl border-2 border-border bg-surface p-4 text-base text-text focus:border-primary focus:ring-2 focus:ring-focus/40 focus:outline-none"
            {...register('text')}
          />
          <p id={`${promptId}-hint`} className="mt-1 text-sm text-text-muted">
            Ctrl or ⌘ + Enter to continue.
          </p>
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="quiz-action min-h-11 rounded-xl border-2 border-border px-5 font-semibold text-text"
          >
            Back
          </button>
        )}
        {allowSkip && (
          <button
            type="button"
            onClick={() => {
              onCommit(question.id, { skipped: true });
            }}
            className="quiz-action quiz-action-ghost min-h-11 rounded-xl px-5 font-semibold text-text-muted hover:text-text"
          >
            {skipLabel}
          </button>
        )}
        <button
          type="submit"
          className="quiz-action quiz-action-primary ml-auto min-h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 px-6 font-bold text-white shadow-lg"
        >
          {position === total ? finalLabel : 'Next'}
        </button>
      </div>
    </form>
  );
}

export default memo(QuestionView);
