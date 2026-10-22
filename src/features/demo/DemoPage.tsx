import { useEffect, useState } from 'react';
import { loadSketchFonts } from '@/ui/sketch/loadFonts';
import '@/ui/sketch/sketch.css';
import { demoAdapter } from './adapter';
import { learningScience } from './bank';
import DemoQuiz from './components/DemoQuiz';
import DemoResult from './components/DemoResult';
import DemoSetup from './components/DemoSetup';
import type { DemoState, LocalDiagnosticAdapter } from './localAdapter';
import type { DemoSelfReport } from './placement';
import type { DemoPrefs } from './prefs';

type View = { kind: 'intro'; starting: boolean } | { kind: 'resuming' } | { kind: 'attempt'; state: DemoState };

const TITLE = 'Learning science for exam prep';

/**
 * /demo (PRD-UI §7b, FR-26): a public, 5-minute diagnostic that runs entirely in the browser on the
 * real quiz engine. No API calls, no cookies, no third-party scripts; it sits outside the root
 * route, so auth/me, refresh and the realtime socket never start.
 */
export default function DemoPage({ adapter = demoAdapter }: { adapter?: LocalDiagnosticAdapter }) {
  const [view, setView] = useState<View>(() =>
    adapter.currentId() ? { kind: 'resuming' } : { kind: 'intro', starting: false },
  );

  useEffect(() => loadSketchFonts(), []);

  // A reload resumes this browser's attempt; one that cannot be read starts over.
  useEffect(() => {
    if (view.kind !== 'resuming') return;
    let live = true;
    adapter.load(adapter.currentId() ?? '').then(
      (state) => {
        if (live) setView({ kind: 'attempt', state });
      },
      () => {
        adapter.reset();
        if (live) setView({ kind: 'intro', starting: false });
      },
    );
    return () => {
      live = false;
    };
  }, [adapter, view.kind]);

  const start = (selfReport: DemoSelfReport, prefs: DemoPrefs) => {
    setView({ kind: 'intro', starting: true });
    void adapter.start(selfReport, prefs).then((state) => {
      setView({ kind: 'attempt', state });
    });
  };

  const retake = () => {
    adapter.reset();
    setView({ kind: 'intro', starting: false });
    window.scrollTo({ top: 0 });
  };

  const state = view.kind === 'attempt' ? view.state : null;
  const placement = state?.placement;

  return (
    <div className="sketch">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 pt-4">
        <span className="sk-annotation">Eduujoy</span>
        <span className="sk-stage-badge sk-label">Demo, no sign-up</span>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-6 pb-12">
        {view.kind === 'intro' && (
          <>
            <h1>Find your starting point in learning science</h1>
            <p className="sk-prose">
              A 5-minute diagnostic on studying for exams: retrieval practice, spacing, interleaving and knowing what you
              know. It runs entirely in your browser. This sets your starting point; it is not a test.
            </p>
            <DemoSetup starting={view.starting} onStart={start} />
          </>
        )}
        {view.kind === 'resuming' && (
          <>
            <h1>{TITLE}</h1>
            <p role="status">Picking up where you left off…</p>
          </>
        )}
        {state && placement && (
          <>
            <h1>Your starting point</h1>
            <DemoResult
              bank={learningScience}
              placement={placement}
              graded={state.graded}
              prefs={state.prefs}
              onRetake={retake}
            />
          </>
        )}
        {state && !placement && (
          <>
            <h1>{TITLE}</h1>
            <p className="text-sk-text-muted">This sets your starting point; it is not a test.</p>
            <DemoQuiz
              state={state}
              adapter={adapter}
              onNext={(next) => {
                setView({ kind: 'attempt', state: next });
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}
