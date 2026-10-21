import { Brain } from 'lucide-react';

export interface LoadingScreenProps {
  title?: string;
  message?: string;
}

/** Full-screen branded wait state. Shown while a long job runs; U7 adds staged progress. */
export default function LoadingScreen({
  title = 'Analyzing your goals...',
  message = 'Crafting your personalized learning journey!',
}: LoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500"
    >
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 animate-pulse rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-300/20 blur-3xl [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-pink-300/30 blur-2xl [animation-delay:2s]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center p-6 text-white">
        <div className="relative h-24 w-24" aria-hidden="true">
          <div className="absolute inset-0 animate-ping rounded-full bg-white opacity-20" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-2xl">
            <Brain className="h-12 w-12 animate-pulse text-indigo-600" />
          </div>
        </div>
        <h2 className="mt-8 text-center text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-center text-lg text-indigo-100">{message}</p>
      </div>
    </div>
  );
}
