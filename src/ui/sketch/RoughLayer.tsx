import type { RefObject } from 'react';

/**
 * The SVG a rough shape draws into: absolutely positioned over its box (`.sk-rough`), so drawing
 * never moves layout, hidden from assistive tech, and never takes pointer events.
 */
export default function RoughLayer({ svgRef }: { svgRef: RefObject<SVGSVGElement | null> }) {
  return <svg ref={svgRef} className="sk-rough" aria-hidden="true" focusable="false" />;
}
