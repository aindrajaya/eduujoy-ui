import type { QueryClient } from '@tanstack/react-query';
import type { Me, WsCheckpointGraded, WsEntitlementChanged, WsPathReady, WsStageAdvanced } from '@/api/types';
import { sessionKeys } from '@/auth/session';
import { pathKeys } from '@/features/paths/keys';
import { progressKeys } from '@/features/progress/keys';
import { STAGE_LABEL } from '@/lib/levels';
import { toast } from '@/ui/toast/store';

/** Server → client events on `/realtime` (contract x-socket-events). */
export interface RealtimeEvents {
  'path.ready': WsPathReady;
  'checkpoint.graded': WsCheckpointGraded;
  'stage.advanced': WsStageAdvanced;
  'entitlement.changed': WsEntitlementChanged;
}

export type RealtimeEventName = keyof RealtimeEvents;
export const REALTIME_EVENTS: readonly RealtimeEventName[] = [
  'path.ready',
  'checkpoint.graded',
  'stage.advanced',
  'entitlement.changed',
];

export interface RealtimeContext {
  client: QueryClient;
  /** The current pathname; screens that already show an outcome skip the toast. */
  pathname: () => string;
  navigate: (to: string) => void;
}

/** Maps one event to cache updates and, where the learner is elsewhere, a toast (PRD-UI §5). */
export function applyRealtimeEvent<E extends RealtimeEventName>(
  ctx: RealtimeContext,
  name: E,
  payload: RealtimeEvents[E],
): void {
  const { client, pathname, navigate } = ctx;
  switch (name) {
    case 'path.ready': {
      const { pathId, jobId } = payload as RealtimeEvents['path.ready'];
      void client.invalidateQueries({ queryKey: pathKeys.all });
      void client.invalidateQueries({ queryKey: progressKeys.all });
      // The generation screen announces and opens the path itself.
      if (jobId && pathname() === `/paths/new/${jobId}`) return;
      toast({
        title: 'Your path is ready',
        tone: 'success',
        action: {
          label: 'Open',
          onClick: () => {
            navigate(`/paths/${encodeURIComponent(pathId)}`);
          },
        },
      });
      return;
    }
    case 'checkpoint.graded': {
      const { result } = payload as RealtimeEvents['checkpoint.graded'];
      void client.invalidateQueries({ queryKey: pathKeys.all });
      void client.invalidateQueries({ queryKey: progressKeys.all });
      // The checkpoint screen shows the result in place.
      if (pathname().startsWith('/checkpoints/')) return;
      toast({
        title: result.passed ? `Checkpoint passed: ${result.score}%` : `Checkpoint graded: ${result.score}%`,
        tone: result.passed ? 'success' : 'info',
      });
      return;
    }
    case 'stage.advanced': {
      const { to, reassessmentJobId } = payload as RealtimeEvents['stage.advanced'];
      void client.invalidateQueries({ queryKey: progressKeys.all });
      void client.invalidateQueries({ queryKey: pathKeys.all });
      toast({
        title: `You moved up to ${STAGE_LABEL[to.stage]}`,
        tone: 'success',
        ...(reassessmentJobId
          ? {
              action: {
                label: 'See your next path',
                onClick: () => {
                  navigate(`/paths/new/${encodeURIComponent(reassessmentJobId)}`);
                },
              },
            }
          : {}),
      });
      return;
    }
    case 'entitlement.changed': {
      const { plan, quota } = payload as RealtimeEvents['entitlement.changed'];
      const before = client.getQueryData<Me | null>(sessionKeys.me());
      client.setQueryData<Me | null>(sessionKeys.me(), (me) => (me ? { ...me, plan, quota } : me));
      if (before && before.plan !== plan) {
        toast({ title: plan === 'subscription' ? 'Your subscription is active' : 'You are on the free plan', tone: 'success' });
      } else if (before && before.quota.credits < quota.credits) {
        toast({ title: `Credits added: you have ${quota.credits}`, tone: 'success' });
      }
      return;
    }
  }
}
