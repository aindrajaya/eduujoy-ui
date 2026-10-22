import { ArrowRight, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

const SPLASH_MS = 3000;
const SPLASH_EXIT_MS = 600;

/** The welcome screen; continues on its own after 3 s or on "Get started". */
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
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <main className={`text-center transition-opacity duration-200 ${exiting ? 'opacity-0' : 'opacity-100'}`}>
        <div
          className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full border-2 border-ink bg-surface shadow-lg"
          aria-hidden="true"
        >
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
        <h1 className="mb-6 text-5xl text-text">Welcome to Eduujoy</h1>
        <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-text-muted">
          Learn any topic one step at a time, starting from where you are.
        </p>
        <button
          type="button"
          onClick={() => {
            setExiting(true);
          }}
          className="sk-btn sk-btn-primary min-h-12 px-8 text-lg"
        >
          Get started
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="mt-6 text-sm text-text-muted">Continuing in a few seconds…</p>
      </main>
    </div>
  );
}
