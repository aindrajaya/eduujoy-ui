import type { ReactNode } from 'react';
import type { BloomLevel, DreyfusStage } from '@/api/types';
import RoughLayer from './RoughLayer';
import { roughSeed, useRough } from './useRough';

export interface SketchGridCellProps {
  stage: DreyfusStage;
  bloom: BloomLevel;
  /** The learner's cell: hatched in the stage colour. */
  here: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * One Dreyfus × Bloom cell (`.sk-grid-cell`). The "now" cell starts with CSS hatching and, after the
 * first paint, gets rough.js hatching seeded by its stage and level (U12b), so it draws the same
 * every time; the CSS hatching goes once the rough one has drawn.
 */
export default function SketchGridCell({ stage, bloom, here, className = '', children }: SketchGridCellProps) {
  const { ref, painted } = useRough(here ? 'hatch' : null, roughSeed(`${stage}:${bloom}`));
  return (
    <td
      data-stage={stage}
      data-here={here || undefined}
      data-rough={(here && painted) || undefined}
      className={`sk-grid-cell ${className}`.trim()}
    >
      {here && <RoughLayer svgRef={ref} />}
      {children}
    </td>
  );
}
