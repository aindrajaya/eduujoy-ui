import { BLOOM_LABEL, STAGE_LABEL } from '@/lib/levels';
import BloomChip from '@/ui/sketch/BloomChip';
import StageBadge from '@/ui/sketch/StageBadge';
import { BLOOMS, type Bank } from '../bank';
import type { Confidence, DemoPlacement, Graded } from '../placement';
import { goalLine, resourceFor, stepMinutes, timeFitLine, type DemoPrefs } from '../prefs';
import DemoGrid from './DemoGrid';

const CONFIDENCE: Record<Confidence, string> = {
  high: 'The answers agree with each other, so this placement is fairly firm.',
  medium: 'One level went better than a level below it, so treat this placement as a first guess.',
  low: 'The answers were mixed, so treat this placement as a first guess.',
};

function status(g: Graded): string {
  if (g.correct) return 'Correct';
  // "I don't know yet" is never called wrong (PRD-UI §4b learning rules).
  return g.skipped ? 'You said you don’t know yet' : 'Not this time';
}

export interface DemoResultProps {
  bank: Bank;
  placement: DemoPlacement;
  graded: readonly Graded[];
  prefs: DemoPrefs;
  onRetake: () => void;
}

/** The demo's result (PRD-UI §7b): grid, per-level breakdown, next step, under the hood, Retake. */
export default function DemoResult({ bank, placement, graded, prefs, onRetake }: DemoResultProps) {
  const { stage, verified, reason, confidence, promoted, levels } = placement;
  const item = (id: string) => bank.items.find((i) => i.id === id);

  return (
    <div className="space-y-8">
      <section className="sk-card space-y-3" aria-label="Your placement">
        <div className="flex flex-wrap items-center gap-3">
          <StageBadge stage={stage} />
          {verified ? (
            <span className="sk-label">
              Verified up to <BloomChip bloom={verified} />
            </span>
          ) : (
            <span className="sk-label">Start at C1 Remember</span>
          )}
        </div>
        <p>{reason}</p>
        {promoted && <p>Your experience moved you up one stage, the most a self-report can.</p>}
        <p className="text-sk-text-muted">{CONFIDENCE[confidence]}</p>
        <p className="text-sk-text-muted">
          This is a demo placement from a fixed set of 18 items. In Eduujoy, the diagnostic runs on your own topic.
        </p>
      </section>

      <section aria-labelledby="demo-grid" className="space-y-3">
        <h2 id="demo-grid" className="sk-display-lg">
          Where you sit
        </h2>
        <DemoGrid stage={stage} bloom={verified ?? 'C1'} />
        <p className="sk-annotation">
          You are here: {STAGE_LABEL[stage]}, {verified ?? 'C1'} {BLOOM_LABEL[verified ?? 'C1']}
        </p>
      </section>

      <section aria-labelledby="demo-levels" className="space-y-3">
        <h2 id="demo-levels" className="sk-display-lg">
          How each level went
        </h2>
        <ul className="space-y-3">
          {BLOOMS.map((bloom) => {
            const tally = levels[bloom];
            const asked = graded.filter((g) => g.bloom === bloom);
            return (
              <li key={bloom} className="sk-card space-y-2">
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <BloomChip bloom={bloom} />
                  <span className="sk-label">
                    {tally.asked ? `${String(tally.correct)} of ${String(tally.asked)} correct` : 'Not asked this time'}
                  </span>
                </p>
                {asked.map((g) => {
                  const it = item(g.itemId);
                  if (!it) return null;
                  const source = bank.sources[it.source];
                  return (
                    <details key={g.itemId} className="quiz-field p-3">
                      <summary className="cursor-pointer">
                        <span className="font-semibold">{status(g)}:</span> {it.prompt}
                      </summary>
                      <p className="mt-2">{it.explanation}</p>
                      {source && (
                        <p className="mt-2 text-sk-text-muted">
                          Source:{' '}
                          {source.url ? (
                            <a href={source.url} className="text-sk-primary underline">
                              {source.label}
                            </a>
                          ) : (
                            source.label
                          )}
                        </p>
                      )}
                    </details>
                  );
                })}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="demo-next" className="space-y-3">
        <h2 id="demo-next" className="sk-display-lg">
          Your next step
        </h2>
        <p>{goalLine(prefs)}</p>
        <p>{timeFitLine(prefs, bank.nextSteps[stage].length)}</p>
        <p>The first three steps of a path at the next stage would be:</p>
        <ol className="space-y-3">
          {bank.nextSteps[stage].map((step, n) => (
            <li key={step.title} className="sk-card space-y-2">
              <span className="sk-title block">{step.title}</span>
              <span className="flex flex-wrap items-center gap-2">
                <BloomChip bloom={step.bloom} />
                <span className="sk-label text-sk-text-muted">
                  {resourceFor(prefs, n)} · about {stepMinutes(prefs)} min
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <details className="sk-card">
        <summary className="sk-title cursor-pointer">Under the hood</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            One quiz engine: the reducer, QuizProvider and drafts here are the ones the signed-in diagnostic runs on. A
            DiagnosticPort interface hides where answers go; on this page a local adapter stands in for the API, so no
            screen changes.
          </li>
          <li>Drafts: your answers are saved in this browser a second after each change, so a reload returns to the same question.</li>
          <li>
            Idempotent submit: each set carries one key, so a double tap or a retry replays the first result instead of
            counting twice.
          </li>
          <li>
            Adaptive selection: one item each at C1–C4, then items around the highest level you passed, and up to four
            more when the answers disagree. 8 to 12 items in all.
          </li>
          <li>
            Placement: the highest level with at least 2 of 3 right, with every lower level at least half right, sets
            the stage. Your self-report can move it up one stage.
          </li>
          <li>Nothing leaves your browser: no account, no cookies and no network requests.</li>
        </ul>
      </details>

      <button type="button" className="sk-btn sk-btn-primary w-full" onClick={onRetake}>
        Retake
      </button>
    </div>
  );
}
