import QuizProvider from '@/features/quiz/QuizProvider';
import QuizRunner from '@/features/quiz/QuizRunner';
import { DEMO_DRAFT_OWNER, type DemoState, type LocalDiagnosticAdapter } from '../localAdapter';

const BATCH = 4;

export interface DemoQuizProps {
  state: DemoState;
  adapter: LocalDiagnosticAdapter;
  onNext: (state: DemoState) => void;
}

/**
 * One batch on the shared quiz engine (QuizProvider, reducer, drafts, idempotent submit), with the
 * local adapter behind the same DiagnosticPort the signed-in diagnostic uses (PRD-UI §7b).
 */
export default function DemoQuiz({ state, adapter, onNext }: DemoQuizProps) {
  const { answered, estimatedTotal } = state.progress;
  const quizId = `demo:${state.id}:${state.items[0]?.id ?? 'empty'}`;
  const set = Math.floor(answered / BATCH) + 1;
  const sets = Math.max(set, Math.ceil(estimatedTotal / BATCH));

  return (
    <div className="space-y-6">
      <div>
        <div className="sk-label mb-2 flex justify-between text-sk-text-muted">
          <span>
            Set {set} of about {sets}
          </span>
          <span>
            {answered} of about {estimatedTotal} answered
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Demo progress"
          aria-valuemin={0}
          aria-valuemax={estimatedTotal}
          aria-valuenow={answered}
          className="sk-meter"
        >
          <div style={{ width: `${String(Math.min(100, (answered / Math.max(1, estimatedTotal)) * 100))}%` }} />
        </div>
      </div>
      <div className="sk-card">
        <QuizProvider key={quizId} quizId={quizId} questions={state.items}>
          <QuizRunner
            userId={DEMO_DRAFT_OWNER}
            clearOtherDrafts={false}
            allowSkip
            skipLabel="I don’t know yet"
            autoSubmit
            submitLabel="Continue"
            submit={(answers, idempotencyKey) => adapter.submitAnswers(state.id, state.items, answers, idempotencyKey)}
            onSubmitted={onNext}
          />
        </QuizProvider>
      </div>
    </div>
  );
}
