import { useVirtualizer } from '@tanstack/react-virtual';
import { Flag } from 'lucide-react';
import { useRef } from 'react';
import { useQuizDispatch, useQuizQuestions, useQuizState } from './context';
import { answerSummary } from './summary';

/**
 * Every question with its answer, virtualised so 50 long questions scroll smoothly on a mid-range
 * phone (PRD-UI §7). Loaded on demand (PRD-UI §9). Tapping a row goes back to that question.
 */
export default function ReviewList() {
  const questions = useQuizQuestions();
  const { answers, flagged } = useQuizState();
  const dispatch = useQuizDispatch();
  const scrollRef = useRef<HTMLDivElement>(null);
  // This app does not use the React Compiler, so the virtualizer's unmemoisable API is fine here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: questions.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 88,
    overscan: 6,
    // Lets the first rows render before layout (and in tests).
    initialRect: { width: 360, height: 600 },
  });

  return (
    <div ref={scrollRef} className="max-h-[60dvh] overflow-y-auto rounded-xl border border-border" tabIndex={-1}>
      <ol aria-label="Your answers" className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const question = questions[item.index];
          if (!question) return null;
          const answer = answers[question.id];
          const isFlagged = flagged.has(question.id);
          return (
            <li
              key={question.id}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full border-b border-border"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'GO_TO', index: item.index });
                }}
                className="flex w-full items-start gap-3 p-4 text-left hover:bg-surface-muted"
              >
                <span className="w-6 flex-shrink-0 font-semibold text-text-muted">{item.index + 1}.</span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-text">{question.prompt}</span>
                  <span className={`mt-1 block truncate text-sm ${answer ? 'text-text-muted' : 'font-semibold text-warning'}`}>
                    {answerSummary(question, answer)}
                  </span>
                </span>
                {isFlagged && (
                  <span className="flex flex-shrink-0 items-center gap-1 text-sm text-warning">
                    <Flag className="h-4 w-4" aria-hidden="true" />
                    Flagged
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
