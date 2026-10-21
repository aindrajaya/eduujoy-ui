/** "4:10" or "1:02:03" → seconds; undefined for missing or malformed values. */
export function parseTimestamp(value: string | null | undefined): number | undefined {
  if (!value || !/^\d{1,2}(:\d{2}){1,2}$/.test(value)) return undefined;
  return value.split(':').reduce((total, part) => total * 60 + Number(part), 0);
}

/** Seconds → "04:10" (or "1:02:03" past an hour). */
export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
