import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { getMe } from '@/api/endpoints/auth';
import { env } from '@/lib/env';
import { applyJobEvent, emptyJobView, isTerminal, readResumePoint, saveResumePoint, type JobView } from './jobView';
import { jobKeys } from './keys';
import { openEventStream, SseHttpError } from './sse';

export interface UseJobStreamOptions {
  onCompleted?: (view: JobView) => void;
  /** Base reconnect delay; doubles per attempt up to 10 s. */
  backoffMs?: number;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });

/**
 * PRD-UI §5: streams GET /v1/jobs/{id}/events into jobKeys.detail(jobId). It resumes after a
 * reload from the stored Last-Event-ID, reconnects with backoff when the stream drops, and refreshes
 * the session once on 401. The learner can leave; the stream stops on unmount.
 */
export function useJobStream(jobId: string, { onCompleted, backoffMs = 1000 }: UseJobStreamOptions = {}) {
  const client = useQueryClient();
  const key = jobKeys.detail(jobId);
  const query = useQuery<JobView>({
    queryKey: key,
    // Synchronous, so a reloaded page shows the last progress at once.
    initialData: () => readResumePoint(jobId) ?? emptyJobView(),
    queryFn: () => readResumePoint(jobId) ?? emptyJobView(),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
  const onCompletedRef = useRef(onCompleted);
  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    // Read through a function: abort happens asynchronously, which TypeScript cannot narrow.
    const aborted = () => signal.aborted;
    const streamKey = jobKeys.detail(jobId);
    const read = () => client.getQueryData<JobView>(streamKey) ?? readResumePoint(jobId) ?? emptyJobView();
    const write = (view: JobView) => {
      client.setQueryData(streamKey, view);
      saveResumePoint(jobId, view);
    };

    void (async () => {
      let attempt = 0;
      let refreshedSession = false;
      while (!aborted() && !isTerminal(read())) {
        try {
          const stream = await openEventStream(`${env.apiUrl}/v1/jobs/${encodeURIComponent(jobId)}/events`, {
            lastEventId: read().lastEventId,
            signal,
          });
          attempt = 0;
          for await (const message of stream) {
            const view = applyJobEvent(read(), message);
            write(view);
            if (isTerminal(view)) {
              if (view.status === 'completed') onCompletedRef.current?.(view);
              return;
            }
          }
        } catch (error) {
          if (aborted()) return;
          if (error instanceof SseHttpError) {
            if (error.status === 401 && !refreshedSession) {
              refreshedSession = true;
              try {
                await getMe(); // the API client refreshes the session on 401
                continue;
              } catch {
                // fall through: signed out
              }
            }
            if (error.status === 401 || error.status === 403 || error.status === 404) {
              write({
                ...read(),
                status: 'failed',
                failed: {
                  jobId,
                  retryable: false,
                  problem: {
                    type: 'about:blank',
                    title: error.status === 404 ? 'Job not found' : 'Not allowed',
                    status: error.status,
                    code: error.status === 404 ? 'NOT_FOUND' : error.status === 403 ? 'FORBIDDEN' : 'UNAUTHENTICATED',
                    requestId: '',
                  },
                },
              });
              return;
            }
          }
        }
        if (aborted()) return;
        write({ ...read(), status: 'reconnecting' });
        await sleep(Math.min(backoffMs * 2 ** attempt, 10_000), signal);
        attempt += 1;
      }
    })();

    return () => {
      controller.abort();
    };
  }, [client, jobId, backoffMs]);

  return query.data;
}
