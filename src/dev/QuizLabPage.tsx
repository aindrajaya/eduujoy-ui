import { useState } from 'react';
import { useSession } from '@/auth/session';
import QuizProvider from '@/features/quiz/QuizProvider';
import QuizRunner from '@/features/quiz/QuizRunner';
import type { QuizQuestion } from '@/features/quiz/types';

// E2E-only harness (built with --mode e2e, never in production): a 50-question quiz for the
// PRD-UI §11 U5 perf check, "typing in a 50-question quiz keeps INP ≤ 200 ms".
const LONG = 'Consider a team that ships weekly and has no researcher. ';

const LAB_QUESTIONS: QuizQuestion[] = Array.from({ length: 50 }, (_, i) => {
  const kind = (['single_choice', 'open', 'multi_choice', 'short_answer'] as const)[i % 4] ?? 'open';
  const prompt = `${i + 1}. ${LONG.repeat(3)}What would you do first, and why?`;
  return kind === 'single_choice' || kind === 'multi_choice'
    ? { id: `lab-${i + 1}`, kind, prompt, options: ['Interview users', 'Run a survey', 'Read analytics', 'Ship and see'].map((label, j) => ({ id: `o${j}`, label })) }
    : { id: `lab-${i + 1}`, kind, prompt };
});

export default function QuizLabPage() {
  const { data: me } = useSession();
  const [result, setResult] = useState<string | null>(null);
  return (
    <main className="mx-auto max-w-2xl p-4 md:p-6">
      <h1 className="mb-6 text-text">Quiz lab</h1>
      {result ? (
        <p role="status">{result}</p>
      ) : (
        <QuizProvider quizId="lab" questions={LAB_QUESTIONS}>
          <QuizRunner
            userId={me?.user.id}
            submit={(answers) => Promise.resolve(Object.keys(answers).length)}
            onSubmitted={(count) => {
              setResult(`Submitted ${count} answers`);
            }}
          />
        </QuizProvider>
      )}
    </main>
  );
}
