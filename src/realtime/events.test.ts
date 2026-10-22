import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockCheckpointFailed, mockCheckpointResult, mockMe } from '@/api/mocks/data';
import type { Me } from '@/api/types';
import { sessionKeys } from '@/auth/session';
import { pathKeys } from '@/features/paths/keys';
import { progressKeys } from '@/features/progress/keys';
import { createTestQueryClient } from '@/test/providers';
import { getToasts, resetToasts } from '@/ui/toast/store';
import { applyRealtimeEvent, type RealtimeContext } from './events';

afterEach(() => {
  resetToasts();
});

function context(pathname = '/today'): RealtimeContext & { invalidated: unknown[][] } {
  const client = createTestQueryClient();
  const invalidated: unknown[][] = [];
  vi.spyOn(client, 'invalidateQueries').mockImplementation((filters) => {
    invalidated.push([...(filters?.queryKey ?? [])]);
    return Promise.resolve();
  });
  return { client, pathname: () => pathname, navigate: vi.fn(), invalidated };
}

describe('applyRealtimeEvent (PRD-UI §5)', () => {
  it('path.ready refreshes paths and progress and offers to open the path', () => {
    const ctx = context();
    applyRealtimeEvent(ctx, 'path.ready', { pathId: 'path-2', topicId: 't', jobId: 'job-9' });
    expect(ctx.invalidated).toEqual([[...pathKeys.all], [...progressKeys.all]]);
    const [shown] = getToasts();
    expect(shown?.title).toBe('Your path is ready');
    shown?.action?.onClick();
    expect(ctx.navigate).toHaveBeenCalledWith('/paths/path-2');
  });

  it('path.ready stays quiet on that job’s own generation screen', () => {
    applyRealtimeEvent(context('/paths/new/job-9'), 'path.ready', { pathId: 'p', topicId: 't', jobId: 'job-9' });
    expect(getToasts()).toHaveLength(0);
  });

  it('checkpoint.graded refreshes and toasts the score, except on the checkpoint screen', () => {
    const ctx = context();
    applyRealtimeEvent(ctx, 'checkpoint.graded', { pathId: 'path-1', result: mockCheckpointResult });
    applyRealtimeEvent(ctx, 'checkpoint.graded', { pathId: 'path-1', result: mockCheckpointFailed });
    expect(getToasts().map((t) => t.title)).toEqual(['Checkpoint passed: 87%', 'Checkpoint graded: 40%']);
    expect(ctx.invalidated).toContainEqual([...progressKeys.all]);
    resetToasts();
    applyRealtimeEvent(context('/checkpoints/step-2'), 'checkpoint.graded', { pathId: 'p', result: mockCheckpointResult });
    expect(getToasts()).toHaveLength(0);
  });

  it('stage.advanced names the new stage and links the next path job when there is one', () => {
    const ctx = context();
    const move = { topicId: 't', from: { stage: 'advanced_beginner', bloom: 'C4' }, to: { stage: 'competent', bloom: 'C3' } } as const;
    applyRealtimeEvent(ctx, 'stage.advanced', { ...move, reassessmentJobId: 'job-7' });
    const [shown] = getToasts();
    expect(shown?.title).toBe('You moved up to Competent');
    shown?.action?.onClick();
    expect(ctx.navigate).toHaveBeenCalledWith('/paths/new/job-7');
    resetToasts();
    applyRealtimeEvent(ctx, 'stage.advanced', { ...move, reassessmentJobId: null });
    expect(getToasts()[0]?.action).toBeUndefined();
  });

  it('entitlement.changed updates the session in place and says what changed', () => {
    const ctx = context();
    ctx.client.setQueryData<Me>(sessionKeys.me(), mockMe);
    const quota = { ...mockMe.quota, monthlyPaths: 10 };
    applyRealtimeEvent(ctx, 'entitlement.changed', { plan: 'subscription', quota });
    expect(ctx.client.getQueryData<Me>(sessionKeys.me())).toMatchObject({ plan: 'subscription', quota });
    expect(getToasts()[0]?.title).toBe('Your subscription is active');
    resetToasts();
    applyRealtimeEvent(ctx, 'entitlement.changed', { plan: 'subscription', quota: { ...quota, credits: quota.credits + 5 } });
    expect(getToasts()[0]?.title).toBe(`Credits added: you have ${quota.credits + 5}`);
  });

  it('entitlement.changed without a session changes nothing', () => {
    const ctx = context();
    applyRealtimeEvent(ctx, 'entitlement.changed', { plan: 'subscription', quota: mockMe.quota });
    expect(ctx.client.getQueryData(sessionKeys.me())).toBeUndefined();
    expect(getToasts()).toHaveLength(0);
  });
});
