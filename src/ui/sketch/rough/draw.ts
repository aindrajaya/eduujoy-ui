import rough from 'roughjs';

declare global {
  interface Window {
    __eduujoyRough?: boolean;
  }
}

// Keeps this module and roughjs in a lazy chunk of their own (as the demo banks do). Without a side
// effect, the build's small-chunk merge moved shared code into this chunk and /signin then loaded
// it (+10 KB).
window.__eduujoyRough = true;

/** What a rough layer draws: a hachure fill (the grid's "now" cell) or a ring (empty states). */
export type RoughKind = 'hatch' | 'ring';

// Stroke widths and gaps follow the CSS sketch: 2 px ink, hatching every 8 px (--sk-space-2).
const INSET = 3;

/**
 * Draws one shape into `svg`, replacing what was there. The lazy chunk behind useRough: the only
 * module that imports roughjs (PRD-UI §4b). Colours come from `currentColor`, so the layer's CSS
 * picks the stage or tone colour and dark mode needs nothing extra.
 */
export function drawRough(svg: SVGSVGElement, kind: RoughKind, seed: number, width: number, height: number) {
  const rc = rough.svg(svg);
  const node =
    kind === 'hatch'
      ? rc.rectangle(INSET, INSET, width - INSET * 2, height - INSET * 2, {
          seed,
          stroke: 'none',
          fill: 'currentColor',
          fillStyle: 'hachure',
          hachureAngle: -45,
          hachureGap: 8,
          fillWeight: 2,
          roughness: 1.2,
        })
      : rc.ellipse(width / 2, height / 2, width - INSET * 2, height - INSET * 2, {
          seed,
          stroke: 'currentColor',
          strokeWidth: 2,
          roughness: 1.4,
        });
  svg.replaceChildren(node);
}
