import nunitoUrl from './fonts/Nunito-latin-wght.woff2?url';

/**
 * Preloads Nunito, the sketch body font (design-system README: "Preload Nunito only"). Called by the
 * screens that use the sketch styles (UD: /demo), never by the shell, so /signin does not fetch it.
 * Excalifont is not preloaded: headings render in the fallback stack first (font-display: swap).
 */
export function preloadSketchFont(doc: Document = document): void {
  if (doc.head.querySelector(`link[rel="preload"][href="${nunitoUrl}"]`)) return;
  const link = doc.createElement('link');
  // Font preloads need crossorigin even on the same origin, or the browser fetches the font twice.
  const attributes: [string, string][] = [
    ['rel', 'preload'],
    ['as', 'font'],
    ['type', 'font/woff2'],
    ['crossorigin', 'anonymous'],
    ['href', nunitoUrl],
  ];
  for (const [name, value] of attributes) link.setAttribute(name, value);
  doc.head.append(link);
}
