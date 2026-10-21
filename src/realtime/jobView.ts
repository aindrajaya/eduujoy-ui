import type {
  CheckpointItemResult,
  JobCompletedEvent,
  JobFailedEvent,
  JobPartialEvent,
  JobProgressEvent,
  PathStep,
} from '@/api/types';
import { readJson, removeItem, writeJson } from '@/lib/storage';
import type { SseMessage } from './sse';

export type JobStreamStatus = 'connecting' | 'running' | 'reconnecting' | 'completed' | 'failed';

/** Everything the UI knows about one job, rebuilt from its event stream. */
export interface JobView {
  status: JobStreamStatus;
  lastEventId?: string;
  progress?: JobProgressEvent;
  /** Path steps streamed as they are designed (JobPartialEvent kind `path_step`). */
  partialSteps: PathStep[];
  /** Checkpoint answers graded so far (JobPartialEvent kind `checkpoint_item`). */
  partialItems: CheckpointItemResult[];
  completed?: JobCompletedEvent;
  failed?: JobFailedEvent;
}

export const emptyJobView = (): JobView => ({ status: 'connecting', partialSteps: [], partialItems: [] });

export const isTerminal = (view: JobView) => view.status === 'completed' || view.status === 'failed';

/** Applies one SSE message (contract x-sse-events) to the view; unknown events only move the id. */
export function applyJobEvent(view: JobView, message: SseMessage): JobView {
  const next: JobView = { ...view, lastEventId: message.id ?? view.lastEventId };
  let data: unknown;
  try {
    data = JSON.parse(message.data);
  } catch {
    return next;
  }
  switch (message.event) {
    case 'progress':
      return { ...next, status: 'running', progress: data as JobProgressEvent };
    case 'partial': {
      const partial = data as JobPartialEvent;
      if (partial.kind === 'checkpoint_item' && partial.itemResult) {
        const item = partial.itemResult;
        const items = next.partialItems.filter((i) => i.itemId !== item.itemId);
        return { ...next, status: 'running', partialItems: [...items, item] };
      }
      if (partial.kind !== 'path_step' || !partial.step) return next;
      const step = partial.step;
      const steps = next.partialSteps.filter((s) => s.id !== step.id);
      return { ...next, status: 'running', partialSteps: [...steps, step].sort((a, b) => a.n - b.n) };
    }
    case 'completed':
      return { ...next, status: 'completed', completed: data as JobCompletedEvent };
    case 'failed':
      return { ...next, status: 'failed', failed: data as JobFailedEvent };
    default:
      return next;
  }
}

// Resume point across reloads: the last event id and what was shown (cleared once the job ends).
const resumeKey = (jobId: string) => `job:${jobId}`;

type ResumePoint = Pick<JobView, 'lastEventId' | 'progress' | 'partialSteps'> & Partial<Pick<JobView, 'partialItems'>>;

function isResumable(value: unknown): value is ResumePoint {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.lastEventId === undefined || typeof v.lastEventId === 'string') &&
    Array.isArray(v.partialSteps) &&
    (v.partialItems === undefined || Array.isArray(v.partialItems))
  );
}

export function readResumePoint(jobId: string): JobView | null {
  const saved = readJson(resumeKey(jobId), isResumable);
  return saved ? { ...emptyJobView(), ...saved, status: 'connecting' } : null;
}

export function saveResumePoint(jobId: string, view: JobView): void {
  if (isTerminal(view)) {
    removeItem(resumeKey(jobId));
    return;
  }
  writeJson(resumeKey(jobId), {
    lastEventId: view.lastEventId,
    progress: view.progress,
    partialSteps: view.partialSteps,
    partialItems: view.partialItems,
  });
}
