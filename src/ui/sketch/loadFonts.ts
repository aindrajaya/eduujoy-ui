import { afterFirstPaint } from '@/lib/idle';

/**
 * Declares the sketch fonts (fonts.css, font-display: swap) once the first paint has settled, so
 * neither font is on the screen's LCP path: requested before the first paint, they added 0.45 s to
 * /demo's LCP in Lighthouse. Headings and text paint in the fallback stacks first, then swap.
 * Called by the screens that use the sketch styles (UD: /demo), never by the shell.
 */
// 1 s, not 0: with an immediate idle callback the font requests could still start before the LCP
// paint, and /demo measured 2.31–2.76 s (same session; 2.31–2.32 s with the 1 s delay).
export function loadSketchFonts(delayMs = 1000): () => void {
  return afterFirstPaint(() => {
    void import('./fonts.css');
  }, delayMs);
}
