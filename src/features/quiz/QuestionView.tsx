import { Flag } from 'lucide-react';
import { memo, useId, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import type { Answer, QuizQuestion } from './types';

interface FormValues {
  choice: string;
  choices: string[];
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
  onCommit: (questionId: string, answer: Answer) => void;
  onBack?: () => void;
  onToggleFlag: (questionId: string) => void;
}

const isChoice = (q: QuizQuestion) => q.kind === 'single_choice' || q.kind === 'multi_choice';

function toAnswer(question: QuizQuestion, values: FormValues): Answer | null {
  if (question.kind === 'single_choice') return values.choice ? { optionIds: [values.choice] } : null;
  if (question.kind === 'multi_choice') return values.choices.length ? { optionIds: values.choices } : null;
  const text = values.text.trim();
  return text ? { text } : null;
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
      text: defaultAnswer?.text ?? '',
    },
  });

  const submit = handleSubmit((values) => {
    const answer = toAnswer(question, values);
    if (!answer) {
      setError('root', {
        message: isChoice(question) ? 'Choose an answer to continue.' : 'Write an answer to continue.',
      });
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
          className={`flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-semibold ${
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

      {isChoice(question) ? (
        <fieldset aria-labelledby={promptId} aria-describedby={error ? errorId : undefined}>
          <div className="space-y-3">
            {(question.options ?? []).map((option) => (
              <label
                key={option.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 border-border p-4 has-checked:border-primary has-checked:bg-primary-soft"
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
            className="w-full rounded-xl border-2 border-border bg-surface p-4 text-base text-text focus:border-primary focus:ring-2 focus:ring-focus/40 focus:outline-none"
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
          <button type="button" onClick={onBack} className="min-h-11 rounded-xl border-2 border-border px-5 font-semibold text-text">
            Back
          </button>
        )}
        {allowSkip && (
          <button
            type="button"
            onClick={() => {
              onCommit(question.id, { skipped: true });
            }}
            className="min-h-11 rounded-xl px-5 font-semibold text-text-muted hover:text-text"
          >
            Skip
          </button>
        )}
        <button
          type="submit"
          className="ml-auto min-h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 px-6 font-bold text-white shadow-lg"
        >
          {position === total ? finalLabel : 'Next'}
        </button>
      </div>
    </form>
  );
}

export default memo(QuestionView);
