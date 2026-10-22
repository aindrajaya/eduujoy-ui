import type { DreyfusStage } from '@/api/types';
import { STAGE_LABEL } from '@/lib/levels';

/** A Dreyfus stage: its colour as a dot, its name in ink beside it (PRD-UI §4b). */
export default function StageBadge({ stage }: { stage: DreyfusStage }) {
  return (
    <span className="sk-stage-badge sk-label" data-stage={stage}>
      <span className="sk-stage-dot" aria-hidden="true" />
      {STAGE_LABEL[stage]}
    </span>
  );
}
