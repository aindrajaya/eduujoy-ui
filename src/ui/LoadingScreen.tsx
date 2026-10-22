import { Brain } from 'lucide-react';

export interface LoadingScreenProps {
  title?: string;
  message?: string;
}

/** Full-screen wait state on paper. Shown while a long job runs; U7 adds staged progress. */
export default function LoadingScreen({
  title = 'Reading your goal…',
  message = 'Putting your learning path together.',
}: LoadingScreenProps) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-dvh items-center justify-center bg-bg p-6">
      <div className="flex flex-col items-center text-center">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-ink bg-surface shadow-lg"
          aria-hidden="true"
        >
          <Brain className="h-12 w-12 animate-pulse text-primary" />
        </div>
        <h2 className="sk-display-lg mt-8 text-text">{title}</h2>
        <p className="mt-2 text-lg text-text-muted">{message}</p>
      </div>
    </div>
  );
}
