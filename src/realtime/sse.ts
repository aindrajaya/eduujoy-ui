// A small fetch-based Server-Sent Events reader. The contract resumes a job stream with the
// Last-Event-ID *header* (GET /v1/jobs/{id}/events). Native EventSource cannot set headers on a new
// connection, so after a page reload it could not resume; fetch can, and it sends the session
// cookies (credentials: 'include').

export interface SseMessage {
  id: string | undefined;
  event: string;
  data: string;
}

export class SseHttpError extends Error {
  constructor(readonly status: number) {
    super(`Event stream answered ${status}`);
    this.name = 'SseHttpError';
  }
}

/** Parses an SSE byte stream (WHATWG event-stream format) into messages. */
export async function* parseEventStream(body: ReadableStream<Uint8Array>): AsyncGenerator<SseMessage> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let id: string | undefined;
  let event = '';
  let data: string[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r\n|\r|\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line === '') {
          if (data.length > 0) yield { id, event: event || 'message', data: data.join('\n') };
          event = '';
          data = [];
          continue;
        }
        if (line.startsWith(':')) continue; // comment / heartbeat
        const colon = line.indexOf(':');
        const field = colon === -1 ? line : line.slice(0, colon);
        const raw = colon === -1 ? '' : line.slice(colon + 1);
        const fieldValue = raw.startsWith(' ') ? raw.slice(1) : raw;
        if (field === 'id') id = fieldValue;
        else if (field === 'event') event = fieldValue;
        else if (field === 'data') data.push(fieldValue);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export interface OpenStreamOptions {
  lastEventId?: string;
  signal?: AbortSignal;
}

/** Opens an event stream with cookies and (when resuming) the Last-Event-ID header. */
export async function openEventStream(url: string, { lastEventId, signal }: OpenStreamOptions = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'text/event-stream', ...(lastEventId ? { 'Last-Event-ID': lastEventId } : {}) },
    signal,
  });
  if (!response.ok || !response.body) throw new SseHttpError(response.status);
  // A proxy or SPA fallback can answer 200 with HTML; treat anything but an event stream as an error.
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    throw new SseHttpError(response.status);
  }
  return parseEventStream(response.body);
}
