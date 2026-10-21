import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockPathJobEvents, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { after, sseResponse, type MockSseEvent } from '@/api/mocks/sse';
import { createTestQueryClient, withQueryClient } from '@/test/providers';
import { applyJobEvent, emptyJobView, readResumePoint, saveResumePoint } from './jobView';
import { jobKeys } from './keys';
import { useJobStream } from './useJobStream';

const events = mockPathJobEvents as unknown as MockSseEvent[];

afterEach(() => {
  window.localStorage.clear();
});

function run(jobId = 'job-1', onCompleted = vi.fn(), backoffMs = 5) {
  const client = createTestQueryClient();
  const hook = renderHook(() => useJobStream(jobId, { onCompleted, backoffMs }), { wrapper: withQueryClient(client) });
  return { client, onCompleted, ...hook };
}

describe('applyJobEvent', () => {
  it('tracks progress, upserts partial steps in order, and ends on completed or failed', () => {
    let view = emptyJobView();
    for (const e of events.slice(0, 3)) view = applyJobEvent(view, { id: e.id, event: e.event, data: JSON.stringify(e.data) });
    expect(view).toMatchObject({ status: 'running', lastEventId: '3', progress: { stage: 'analyse', done: 4 } });
    expect(view.partialSteps.map((s) => s.n)).toEqual([1]);
    const failed = applyJobEvent(view, { id: '9', event: 'failed', data: JSON.stringify({ jobId: 'j', problem: mockProblem(500, 'INTERNAL', 'x') }) });
    expect(failed.status).toBe('failed');
  });

  it('ignores bad JSON and unknown events (but keeps the id), and non-step partials', () => {
    const view = emptyJobView();
    expect(applyJobEvent(view, { id: '4', event: 'progress', data: 'nope' })).toMatchObject({ lastEventId: '4', status: 'connecting' });
    expect(applyJobEvent(view, { id: '5', event: 'mystery', data: '{}' }).lastEventId).toBe('5');
    expect(applyJobEvent(view, { id: undefined, event: 'partial', data: '{"kind":"checkpoint_item"}' }).partialSteps).toEqual([]);
  });
});

describe('resume point', () => {
  it('stores the last event id while running and clears it when the job ends', () => {
    saveResumePoint('j', { ...emptyJobView(), status: 'running', lastEventId: '3' });
    expect(readResumePoint('j')).toMatchObject({ lastEventId: '3', status: 'connecting' });
    saveResumePoint('j', { ...emptyJobView(), status: 'completed' });
    expect(readResumePoint('j')).toBeNull();
  });
});

describe('useJobStream', () => {
  it('streams the job into the cache and calls onCompleted', async () => {
    const { result, client, onCompleted } = run();
    await waitFor(() => {
      expect(result.current.status).toBe('completed');
    });
    expect(result.current.completed?.resultRef).toBe('path-1');
    expect(result.current.partialSteps).toHaveLength(1);
    expect(client.getQueryData(jobKeys.detail('job-1'))).toMatchObject({ status: 'completed' });
    expect(onCompleted).toHaveBeenCalledOnce();
    expect(readResumePoint('job-1')).toBeNull();
  });

  it('reconnects after an early close and resumes with Last-Event-ID', async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get('/v1/jobs/{id}/events', ({ request, response }) => {
        const last = request.headers.get('Last-Event-ID');
        seen.push(last);
        // First connection drops after event 2; the reconnect gets the rest.
        const batch = last ? after(events, last) : events.slice(0, 2);
        return response.untyped(sseResponse(batch));
      }),
    );
    const { result } = run();
    await waitFor(() => {
      expect(result.current.status).toBe('completed');
    });
    expect(seen).toEqual([null, '2']);
  });

  it('after a reload, resumes from the stored Last-Event-ID', async () => {
    saveResumePoint('job-1', { ...emptyJobView(), status: 'running', lastEventId: '3', progress: events[1]!.data as never });
    const seen: (string | null)[] = [];
    server.use(
      http.get('/v1/jobs/{id}/events', ({ request, response }) => {
        seen.push(request.headers.get('Last-Event-ID'));
        return response.untyped(sseResponse(after(events, request.headers.get('Last-Event-ID'))));
      }),
    );
    const { result } = run();
    expect(result.current.progress?.stage).toBe('analyse');
    await waitFor(() => {
      expect(result.current.status).toBe('completed');
    });
    expect(seen[0]).toBe('3');
  });

  it('a 404 ends the stream as failed (not found)', async () => {
    server.use(
      http.get('/v1/jobs/{id}/events', ({ response }) =>
        response.untyped(problemResponse(mockProblem(404, 'NOT_FOUND', 'No such job'))),
      ),
    );
    const { result } = run('missing');
    await waitFor(() => {
      expect(result.current.status).toBe('failed');
    });
    expect(result.current.failed?.problem.code).toBe('NOT_FOUND');
  });

  it('refreshes the session once on 401, then continues', async () => {
    let calls = 0;
    server.use(
      http.get('/v1/jobs/{id}/events', ({ response }) => {
        calls += 1;
        return calls === 1
          ? response.untyped(problemResponse(mockProblem(401, 'UNAUTHENTICATED', 'Expired')))
          : response.untyped(sseResponse(events));
      }),
    );
    const { result } = run();
    await waitFor(() => {
      expect(result.current.status).toBe('completed');
    });
    expect(calls).toBe(2);
  });

  it('shows reconnecting while the network is down', async () => {
    let calls = 0;
    server.use(
      http.get('/v1/jobs/{id}/events', ({ response }) => {
        calls += 1;
        return calls < 3 ? response.untyped(Response.error()) : response.untyped(sseResponse(events));
      }),
    );
    const { result } = run('job-1', vi.fn(), 150);
    await waitFor(() => {
      expect(result.current.status).toBe('reconnecting');
    });
    await waitFor(() => {
      expect(result.current.status).toBe('completed');
    });
  });
});
