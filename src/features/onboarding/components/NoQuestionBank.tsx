import { ArrowRight } from 'lucide-react';
import { useId } from 'react';
import type { Topic } from '@/api/types';
import ErrorNote from '@/ui/ErrorNote';

export interface NoQuestionBankProps {
  /** The topic without a diagnostic item bank (Topic.hasDiagnostic false, contract 0.9.0). */
  topic: Topic;
  /** Contract 0.9.0/0.9.1: up to 3 nearby catalog topics, banked first; may be empty. */
  related: readonly Topic[];
  /** Starts the diagnostic: on this topic (no questions) or on a related one (a normal one). */
  onStart: (topic: Topic) => void;
  onEditTopic: () => void;
  submitting?: boolean;
  errorMessage?: string;
}

/**
 * Before a diagnostic with no questions: say what will happen instead, and offer the nearby topics
 * we can test the learner on (prod report, 22 Oct 2026: a 0-question diagnostic said "complete").
 */
export default function NoQuestionBank({
  topic,
  related,
  onStart,
  onEditTopic,
  submitting = false,
  errorMessage,
}: NoQuestionBankProps) {
  const titleId = useId();
  const relatedTitleId = useId();
  const shown = related.filter((t) => t.id !== topic.id).slice(0, 3);

  return (
    <main aria-labelledby={titleId} className="flex min-h-dvh items-center justify-center bg-bg p-4">
      <div className="sk-card w-full max-w-xl animate-fade-in space-y-6 p-6 md:p-10">
        <div>
          <h1 id={titleId} className="text-text">
            We don’t have questions for {topic.canonicalName} yet
          </h1>
          <p className="mt-2 text-text-muted">
            Your level will come from your self-report, and your first checkpoint will adjust it.
          </p>
        </div>

        {shown.length > 0 && (
          <section aria-labelledby={relatedTitleId} className="space-y-3">
            <h2 id={relatedTitleId} className="sk-title text-text">
              Closer topics we can test you on
            </h2>
            <ul className="space-y-3">
              {shown.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      onStart(t);
                    }}
                    className="quiz-option flex min-h-11 w-full cursor-pointer items-center gap-3 p-4 text-left disabled:opacity-60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="sk-title block text-text">{t.canonicalName}</span>
                      {t.description && <span className="block text-sm text-text-muted">{t.description}</span>}
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="sr-only">: start the diagnostic on this topic</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {errorMessage && <ErrorNote>{errorMessage}</ErrorNote>}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              onStart(topic);
            }}
            className="sk-btn sk-btn-primary flex-1"
          >
            {submitting ? 'Starting…' : `Continue with ${topic.canonicalName}`}
          </button>
          <button type="button" onClick={onEditTopic} className="sk-btn flex-1">
            Change my topic
          </button>
        </div>
      </div>
    </main>
  );
}
