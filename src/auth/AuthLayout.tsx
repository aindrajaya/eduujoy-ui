import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

/** Shared frame for sign-in and sign-up, in the onboarding visual language. */
export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main
      aria-labelledby="auth-title"
      className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 dark:from-bg dark:via-bg dark:to-bg"
    >
      <div className="w-full max-w-md animate-fade-in">
        <header className="mb-6 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg">
            <Sparkles className="h-7 w-7 text-white" aria-hidden="true" />
          </div>
          <h1 id="auth-title" className="text-3xl font-bold text-text">
            {title}
          </h1>
          <p className="mt-2 text-base text-text-muted">{subtitle}</p>
        </header>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-2xl">{children}</div>
      </div>
    </main>
  );
}
