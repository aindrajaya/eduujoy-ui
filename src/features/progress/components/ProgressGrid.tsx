import type { BloomLevel, DreyfusStage, Position } from '@/api/types';
import { BLOOM_LABEL, STAGE_LABEL } from '@/lib/levels';

// Highest stage on top, so moving up the grid reads as progress.
const STAGES: DreyfusStage[] = ['expert', 'proficient', 'competent', 'advanced_beginner', 'novice'];
const BLOOMS: BloomLevel[] = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];

export interface GridPoint {
  position: Position;
  /** Short date for earlier positions, e.g. "14 Oct". */
  label: string;
}

export interface ProgressGridProps {
  topicName: string;
  current: Position;
  /** Earlier positions, oldest first; the current one is not repeated here. */
  history: readonly GridPoint[];
}

const same = (a: Position, b: Position) => a.stage === b.stage && a.bloom === b.bloom;

/**
 * US-09: the Dreyfus × Bloom grid for one topic. A real table, so screen readers can move by row
 * (stage) and column (Bloom level); each marked cell says what it marks.
 */
export default function ProgressGrid({ topicName, current, history }: ProgressGridProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-80 table-fixed border-separate border-spacing-1 text-xs">
        <caption className="sr-only">
          {topicName}: your position by skill stage (rows) and thinking level (columns)
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-24 text-left font-semibold text-text-muted">
              <span className="sr-only">Stage</span>
            </th>
            {BLOOMS.map((bloom) => (
              <th key={bloom} scope="col" className="font-semibold text-text-muted">
                <abbr title={BLOOM_LABEL[bloom]} className="no-underline">
                  {bloom}
                </abbr>
                <span className="sr-only"> {BLOOM_LABEL[bloom]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STAGES.map((stage) => (
            <tr key={stage}>
              <th scope="row" className="pr-1 text-left font-semibold text-text">
                {STAGE_LABEL[stage]}
              </th>
              {BLOOMS.map((bloom) => {
                const cell = { stage, bloom };
                const here = same(cell, current);
                const earlier = history.filter((h) => same(h.position, cell) && !here);
                return (
                  // Now: hatched in the stage colour (no glyph: hatching never sits under text). Earlier:
                  // a dashed outline. Each says what it marks to screen readers (README "Accessibility").
                  <td
                    key={bloom}
                    data-stage={stage}
                    data-here={here || undefined}
                    className={`sk-grid-cell text-center align-middle ${earlier.length ? 'border-dashed border-ink' : ''}`}
                  >
                    {here ? (
                      <span className="sr-only">You are here</span>
                    ) : earlier.length ? (
                      <span className="sr-only">Earlier: {earlier.map((e) => e.label).join(', ')}</span>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 flex gap-4 text-xs text-text-muted" aria-hidden="true">
        <span className="flex items-center gap-1">
          <span className="sk-grid-cell inline-block h-4 w-6" data-here data-stage={current.stage} /> Now
        </span>
        <span className="flex items-center gap-1">
          <span className="sk-grid-cell inline-block h-4 w-6 border-dashed border-ink" /> Earlier
        </span>
      </p>
    </div>
  );
}
