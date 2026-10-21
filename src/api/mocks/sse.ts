import { HttpResponse } from 'msw';

export interface MockSseEvent {
  id: string;
  event: 'progress' | 'partial' | 'completed' | 'failed';
  data: unknown;
}

export const toEventStreamText = (events: readonly MockSseEvent[]) =>
  events.map((e) => `id: ${e.id}\nevent: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`).join('');

/**
 * A text/event-stream response that sends `events` and closes (like the API after a terminal event),
 * or stays open with `keepOpen` (a job still running).
 */
export function sseResponse(events: readonly MockSseEvent[], { keepOpen = false } = {}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`: connected\n\n${toEventStreamText(events)}`));
      if (!keepOpen) controller.close();
    },
  });
  return new HttpResponse(body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
}

/** Events after `lastEventId` (the API replays everything after it on connect). */
export const after = (events: readonly MockSseEvent[], lastEventId: string | null) =>
  lastEventId ? events.slice(events.findIndex((e) => e.id === lastEventId) + 1) : [...events];
