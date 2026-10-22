import type { BloomLevel } from '@/api/types';
import { BLOOM_LABEL } from '@/lib/levels';

/** A Bloom level with its verb, e.g. "C3 Apply" (PRD-UI §4b). */
export default function BloomChip({ bloom }: { bloom: BloomLevel }) {
  return (
    <span className="sk-bloom-chip sk-label">
      {bloom} {BLOOM_LABEL[bloom]}
    </span>
  );
}
