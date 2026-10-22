import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

/** Shared frame for sign-in and sign-up, on paper like onboarding. */
export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main
      aria-labelledby="auth-title"
      className="flex min-h-dvh items-center justify-center bg-bg p-4"
    >
      <div className="w-full max-w-md animate-fade-in">
        <header className="mb-6 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-surface shadow-lg">
            <Sparkles className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <h1 id="auth-title" className="text-3xl text-text">
            {title}
          </h1>
          <p className="mt-2 text-base text-text-muted">{subtitle}</p>
        </header>
        <div className="sk-card p-6">{children}</div>
      </div>
    </main>
  );
}
