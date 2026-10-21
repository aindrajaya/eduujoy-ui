import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/api/mocks/server';
import { openEventStream, parseEventStream, SseHttpError, type SseMessage } from './sse';

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(stream: AsyncGenerator<SseMessage>) {
  const out: SseMessage[] = [];
  for await (const m of stream) out.push(m);
  return out;
}

describe('parseEventStream', () => {
  it('parses ids, event names, multi-line data and ignores comments, even split across chunks', async () => {
    const messages = await collect(
      parseEventStream(
        streamOf(
          ': heartbeat\n\nid: 1\nevent: progress\ndata: {"done":1}\n\n',
          'id: 2\nevent: par',
          'tial\ndata: line one\ndata: line two\r\n\r\n',
          'data: no-name\n\nretry: 5000\nid\n\n',
        ),
      ),
    );
    expect(messages).toEqual([
      { id: '1', event: 'progress', data: '{"done":1}' },
      { id: '2', event: 'partial', data: 'line one\nline two' },
      { id: '2', event: 'message', data: 'no-name' },
    ]);
  });

  it('keeps the last id when a later event has none, and a bare "data" field is empty', async () => {
    const messages = await collect(parseEventStream(streamOf('id: 7\ndata\n\n')));
    expect(messages).toEqual([{ id: '7', event: 'message', data: '' }]);
  });
});

describe('openEventStream', () => {
  it('sends cookies, Accept and Last-Event-ID when resuming', async () => {
    let headers: Headers | undefined;
    server.use(
      http.get('http://sse.test/events', ({ request }) => {
        headers = request.headers;
        return new HttpResponse(streamOf('id: 5\nevent: completed\ndata: {}\n\n'), {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }),
    );
    const messages = await collect(await openEventStream('http://sse.test/events', { lastEventId: '4' }));
    expect(headers?.get('last-event-id')).toBe('4');
    expect(headers?.get('accept')).toBe('text/event-stream');
    expect(messages).toEqual([{ id: '5', event: 'completed', data: '{}' }]);
  });

  it('omits Last-Event-ID on a fresh connection and throws on HTTP errors', async () => {
    let lastEventId: string | null = 'unset';
    server.use(
      http.get('http://sse.test/events', ({ request }) => {
        lastEventId = request.headers.get('last-event-id');
        return new HttpResponse(null, { status: 401 });
      }),
    );
    await expect(openEventStream('http://sse.test/events')).rejects.toEqual(new SseHttpError(401));
    expect(lastEventId).toBeNull();
  });
});

describe('openEventStream content type', () => {
  it('rejects a 200 that is not an event stream (e.g. an SPA fallback page)', async () => {
    server.use(http.get('http://sse.test/events', () => HttpResponse.text('<!doctype html>', { headers: { 'Content-Type': 'text/html' } })));
    await expect(openEventStream('http://sse.test/events')).rejects.toBeInstanceOf(SseHttpError);
  });
});
