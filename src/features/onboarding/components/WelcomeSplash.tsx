import { Play, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

const SPLASH_MS = 3000;
const SPLASH_EXIT_MS = 600;

/** The original app's welcome screen; continues on its own after 3 s or on "Get Started". */
export default function WelcomeSplash({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => {
        if (exiting) onDone();
        else setExiting(true);
      },
      exiting ? SPLASH_EXIT_MS : SPLASH_MS,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [exiting, onDone]);

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-4">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 animate-pulse rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-300/20 blur-3xl [animation-delay:1s]" />
      </div>
      <main
        className={`z-10 text-center transition-all duration-700 ${exiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <div className="mb-8 inline-flex h-24 w-24 animate-bounce items-center justify-center rounded-full bg-white/20 shadow-2xl backdrop-blur-sm">
          <Sparkles className="h-12 w-12 text-white" aria-hidden="true" />
        </div>
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-white">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
            Eduujoy
          </span>
        </h1>
        <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed font-light text-white">
          Your personalized learning journey starts here. Let&apos;s create something amazing
          together.
        </p>
        <button
          type="button"
          onClick={() => {
            setExiting(true);
          }}
          className="group inline-flex min-h-11 items-center gap-3 rounded-full bg-white px-8 py-4 font-bold text-indigo-700 shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <span className="text-lg">Get Started</span>
          <Play className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
        </button>
        <p className="mt-6 animate-pulse text-sm text-white">Auto-continuing in a few seconds...</p>
      </main>
    </div>
  );
}
