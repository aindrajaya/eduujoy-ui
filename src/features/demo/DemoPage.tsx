import { useEffect, useState } from 'react';
import { loadSketchFonts } from '@/ui/sketch/loadFonts';
import { createDemoAdapter } from './adapter';
import type { Bank } from './bank';
import { demoTopics, loadBank as loadDemoBank, type BankEntry } from './banks';
import DemoQuiz from './components/DemoQuiz';
import DemoResult from './components/DemoResult';
import DemoSetup from './components/DemoSetup';
import { storedAttemptBankId, type DemoState, type LocalDiagnosticAdapter } from './localAdapter';
import type { DemoSelfReport } from './placement';
import type { DemoPrefs } from './prefs';

/** An attempt in progress or done: the bank it runs on, its adapter, and its state. */
interface Attempt {
  bank: Bank;
  adapter: LocalDiagnosticAdapter;
  state: DemoState;
}

type View = { kind: 'intro'; starting: boolean } | { kind: 'resuming' } | ({ kind: 'attempt' } & Attempt);

export interface DemoPageProps {
  /** Tests inject these; the route uses the reviewed topics, lazy banks and the 300–600 ms adapter. */
  topics?: readonly BankEntry[];
  loadBank?: (id: string) => Promise<Bank>;
  createAdapter?: (bank: Bank) => LocalDiagnosticAdapter;
}

/**
 * /demo (PRD-UI §7b, FR-26): a public, 5-minute diagnostic that runs entirely in the browser on the
 * real quiz engine. No API calls, no cookies, no third-party scripts; it sits outside the root
 * route, so auth/me, refresh and the realtime socket never start. UD2: the visitor picks a topic;
 * each topic's bank is a lazy chunk.
 */
export default function DemoPage({
  topics = demoTopics,
  loadBank = loadDemoBank,
  createAdapter = createDemoAdapter,
}: DemoPageProps) {
  const [view, setView] = useState<View>(() =>
    storedAttemptBankId() ? { kind: 'resuming' } : { kind: 'intro', starting: false },
  );

  useEffect(() => loadSketchFonts(), []);

  // A reload resumes this browser's attempt on its own bank; one that cannot be read starts over.
  useEffect(() => {
    if (view.kind !== 'resuming') return;
    let live = true;
    const bankId = storedAttemptBankId() ?? '';
    loadBank(bankId)
      .then(async (bank) => {
        const adapter = createAdapter(bank);
        try {
          const state = await adapter.load(adapter.currentId() ?? '');
          if (live) setView({ kind: 'attempt', bank, adapter, state });
        } catch {
          adapter.reset();
          if (live) setView({ kind: 'intro', starting: false });
        }
      })
      .catch(() => {
        if (live) setView({ kind: 'intro', starting: false });
      });
    return () => {
      live = false;
    };
  }, [createAdapter, loadBank, view.kind]);

  const start = (topicId: string, selfReport: DemoSelfReport, prefs: DemoPrefs) => {
    setView({ kind: 'intro', starting: true });
    void loadBank(topicId).then(async (bank) => {
      const adapter = createAdapter(bank);
      const state = await adapter.start(selfReport, prefs);
      setView({ kind: 'attempt', bank, adapter, state });
    });
  };

  const retake = (adapter: LocalDiagnosticAdapter) => {
    adapter.reset();
    setView({ kind: 'intro', starting: false });
    window.scrollTo({ top: 0 });
  };

  const single = topics.length === 1 ? topics[0] : undefined;

  return (
    <div className="sketch">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 pt-4">
        <span className="sk-annotation">Eduujoy</span>
        <span className="sk-stage-badge sk-label">Demo, no sign-up</span>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 pt-6 pb-12">
        {view.kind === 'intro' && (
          <>
            {/* Three display lines reserved on phones: the title wraps to three once Excalifont swaps in
                (after first paint), and the reserve keeps the form below from shifting (CLS). */}
            <h1 className="min-h-[calc(var(--sk-display-xl-line-height)*3em)] sm:min-h-0">
              {single ? `Find your starting point in ${single.shortName ?? single.name}` : 'Find your starting point'}
            </h1>
            <p className="sk-prose">
              {single?.id === 'learning-science'
                ? 'A 5-minute diagnostic on studying for exams: retrieval practice, spacing, interleaving and knowing what you know.'
                : 'A 5-minute diagnostic on a topic you choose.'}{' '}
              It runs entirely in your browser. This sets your starting point; it is not a test.
            </p>
            <DemoSetup topics={topics} starting={view.starting} onStart={start} />
          </>
        )}
        {view.kind === 'resuming' && (
          <>
            <h1>Your demo diagnostic</h1>
            <p role="status">Picking up where you left off…</p>
          </>
        )}
        {view.kind === 'attempt' && view.state.placement && (
          <>
            <h1>Your starting point</h1>
            <DemoResult
              bank={view.bank}
              placement={view.state.placement}
              graded={view.state.graded}
              prefs={view.state.prefs}
              onRetake={() => {
                retake(view.adapter);
              }}
            />
          </>
        )}
        {view.kind === 'attempt' && !view.state.placement && (
          <>
            <h1>{view.bank.topic.name}</h1>
            <p className="text-sk-text-muted">This sets your starting point; it is not a test.</p>
            <DemoQuiz
              state={view.state}
              adapter={view.adapter}
              onNext={(next) => {
                setView({ ...view, state: next });
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}
