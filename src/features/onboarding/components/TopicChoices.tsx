import { useId, useState } from 'react';
import type { Topic } from '@/api/types';

export interface TopicChoicesProps {
  typed: string;
  /** At most three, from POST /v1/topics/resolve with status `choices` (US-01). */
  choices: Topic[];
  onConfirm: (topic: Topic) => void;
  /** "None of these": back to the form to rephrase (the contract has no force-create). */
  onEditTopic: () => void;
  submitting?: boolean;
  errorMessage?: string;
}

/** Disambiguation: the learner confirms which canonical topic they meant. */
export default function TopicChoices({ typed, choices, onConfirm, onEditTopic, submitting = false, errorMessage }: TopicChoicesProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const titleId = useId();
  const selected = choices.find((c) => c.id === selectedId);

  return (
    <main aria-labelledby={titleId} className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="w-full max-w-xl animate-fade-in rounded-2xl border border-border bg-surface p-6 shadow-2xl md:p-10">
        <h1 id={titleId} className="text-2xl font-bold text-text">
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
              {choices.map((topic) => (
                <label
                  key={topic.id}
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 border-border p-4 has-checked:border-primary has-checked:bg-primary-soft"
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
                    <span className="block font-semibold text-text">{topic.canonicalName}</span>
                    {topic.description && <span className="block text-sm text-text-muted">{topic.description}</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {errorMessage && (
            <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
              {errorMessage}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={!selected || submitting}
              className="min-h-11 flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-3 font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Starting…' : 'Continue with this topic'}
            </button>
            <button
              type="button"
              onClick={onEditTopic}
              className="min-h-11 flex-1 rounded-xl border-2 border-border px-6 py-3 font-semibold text-text"
            >
              None of these, change my topic
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
