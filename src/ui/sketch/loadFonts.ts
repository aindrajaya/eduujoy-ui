import { afterFirstPaint } from '@/lib/idle';

/**
 * Declares the sketch fonts (fonts.css, font-display: swap) once the first paint has settled, so
 * neither font is on the screen's LCP path: requested before the first paint, they added 0.45 s to
 * /demo's LCP in Lighthouse. Headings and text paint in the fallback stacks first, then swap.
 * Called by the screens that use the sketch styles (UD: /demo), never by the shell.
 */
export function loadSketchFonts(delayMs = 0): () => void {
  return afterFirstPaint(() => {
    void import('./fonts.css');
  }, delayMs);
}
