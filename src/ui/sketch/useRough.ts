import { useEffect, useRef, useState } from 'react';
import { afterFirstPaint } from '@/lib/idle';
import type { RoughKind } from './rough/draw';

declare global {
  interface Window {
    __eduujoyRoughLayer?: boolean;
  }
}

// Keeps this module (and the grid cell and layer that import it) out of the chunks /signin loads:
// without a side effect, the build's small-chunk merge folded them into a shared chunk there (+0.5 KB).
window.__eduujoyRoughLayer = true;

/**
 * A stable rough.js seed for a key such as "competent:C3" (FNV-1a, never 0), so a shape draws the
 * same on every render and in screenshots (PRD-UI §4b).
 */
export function roughSeed(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash || 1;
}

/**
 * Draws a rough shape into the returned SVG ref once the first paint has settled, loading roughjs
 * as its own lazy chunk, and redraws when the SVG is resized. Until then (and if the chunk fails)
 * the CSS sketch stays; `painted` lets the caller drop its CSS fallback once the SVG has drawn.
 * Pass `null` to draw nothing.
 */
export function useRough(kind: RoughKind | null, seed: number) {
  const ref = useRef<SVGSVGElement>(null);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const svg = ref.current;
    if (!kind || !svg) return;
    let live = true;
    let observer: ResizeObserver | undefined;
    const cancel = afterFirstPaint(() => {
      import('./rough/draw')
        .then(({ drawRough }) => {
          if (!live) return;
          const paint = () => {
            const { width, height } = svg.getBoundingClientRect();
            if (!width || !height) return;
            drawRough(svg, kind, seed, width, height);
            setPainted(true);
          };
          // The observer also fires once on observe, which draws the first time.
          if ('ResizeObserver' in window) {
            observer = new ResizeObserver(paint);
            observer.observe(svg);
          } else paint();
        })
        .catch(() => {
          // The CSS fallback stays.
        });
    });
    return () => {
      live = false;
      cancel();
      observer?.disconnect();
    };
  }, [kind, seed]);

  return { ref, painted };
}
