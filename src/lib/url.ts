/** Returns the URL only if it is absolute http(s); anything else (javascript:, data:, relative) is dropped. */
export function safeExternalUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}
