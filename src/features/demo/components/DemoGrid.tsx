import type { BloomLevel, DreyfusStage } from '@/api/types';
import { BLOOM_LABEL, STAGE_LABEL } from '@/lib/levels';
import { BLOOMS } from '../bank';

// Highest stage on top, so moving up the grid reads as progress.
const STAGES: DreyfusStage[] = ['expert', 'proficient', 'competent', 'advanced_beginner', 'novice'];

/**
 * The Dreyfus × Bloom grid with the visitor's cell hatched and labelled (PRD-UI §7b). A real table,
 * so screen readers move by stage (row) and level (column). CSS hatching until rough.js (U12b).
 */
export default function DemoGrid({ stage, bloom }: { stage: DreyfusStage; bloom: BloomLevel }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-80 table-fixed border-separate border-spacing-1">
        <caption className="sr-only">Your demo placement by skill stage (rows) and thinking level (columns)</caption>
        <thead>
          <tr>
            <th scope="col" className="w-28">
              <span className="sr-only">Stage</span>
            </th>
            {BLOOMS.map((b) => (
              <th key={b} scope="col" className="sk-label">
                <abbr title={BLOOM_LABEL[b]} className="no-underline">
                  {b}
                </abbr>
                <span className="sr-only"> {BLOOM_LABEL[b]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STAGES.map((s) => (
            <tr key={s}>
              <th scope="row" className="sk-label pr-1 text-left">
                {STAGE_LABEL[s]}
              </th>
              {BLOOMS.map((b) => {
                const here = s === stage && b === bloom;
                return (
                  <td key={b} className="sk-grid-cell" data-stage={s} data-here={here || undefined}>
                    {here && <span className="sr-only">You are here</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
