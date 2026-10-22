import { useId, useState } from 'react';
import type { Topic } from '@/api/types';
import ErrorNote from '@/ui/ErrorNote';

export interface TopicChoicesProps {
  typed: string;
  /** At most three, from POST /v1/topics/resolve with status `choices` (US-01). */
  choices: Topic[];
  onConfirm: (topic: Topic) => void;
  /** "None of these": back to the form to rephrase. */
  onEditTopic: () => void;
  /** Contract 0.5.0: none fits, so create a topic from what was typed. */
  onCreateNew: () => void;
  submitting?: boolean;
  errorMessage?: string;
}

/** Disambiguation: the learner confirms which canonical topic they meant. */
export default function TopicChoices({
  typed,
  choices,
  onConfirm,
  onEditTopic,
  onCreateNew,
  submitting = false,
  errorMessage,
}: TopicChoicesProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const titleId = useId();
  // US-01 allows at most three; the contract caps it too, but never show more.
  const shown = choices.slice(0, 3);
  const selected = shown.find((c) => c.id === selectedId);

  return (
    <main aria-labelledby={titleId} className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="sk-card w-full max-w-xl animate-fade-in p-6 md:p-10">
        <h1 id={titleId} className="text-text">
          Which topic did you mean?
        </h1>
        <p className="mt-2 text-text-muted">
          “{typed}” matches more than one topic. Pick the closest so your path is scoped to it.
        </p>

        <form
          className="mt-6 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (selected) onConfirm(selected);
          }}
        >
          <fieldset>
            <legend className="sr-only">Topics</legend>
            <div className="space-y-3">
              {shown.map((topic) => (
                <label
                  key={topic.id}
                  className="quiz-option flex min-h-11 cursor-pointer items-start gap-3 p-4"
                >
                  <input
                    type="radio"
                    name="topic"
                    value={topic.id}
                    checked={selectedId === topic.id}
                    onChange={() => {
                      setSelectedId(topic.id);
                    }}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <span>
                    <span className="sk-title block text-text">{topic.canonicalName}</span>
                    {topic.description && <span className="block text-sm text-text-muted">{topic.description}</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {errorMessage && (
            <ErrorNote>
              {errorMessage}
            </ErrorNote>
          )}

          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={!selected || submitting}
              className="sk-btn sk-btn-primary flex-1"
            >
              {submitting ? 'Starting…' : 'Continue with this topic'}
            </button>
            <button
              type="button"
              onClick={onEditTopic}
              className="sk-btn flex-1"
            >
              None of these, change my topic
            </button>
          </div>
          <p className="text-center text-sm text-text-muted">
            Not listed?{' '}
            <button
              type="button"
              onClick={onCreateNew}
              disabled={submitting}
              className="inline-flex min-h-11 items-center font-semibold text-primary underline disabled:opacity-60"
            >
              Create “{typed}” as a new topic
            </button>
          </p>
        </form>
      </div>
    </main>
  );
}
