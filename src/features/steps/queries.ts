import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { sendFeedback, swapResource, updateStep } from '@/api/endpoints/steps';
import type { ApiError } from '@/api/errors';
import type { FeedbackRequest, Path, PathStep, StepPatchRequest } from '@/api/types';
import { pathKeys } from '@/features/paths/keys';
import { toast } from '@/ui/toast/store';

function replaceStep(client: QueryClient, pathId: string, stepId: string, update: (step: PathStep) => PathStep) {
  client.setQueryData<Path>(pathKeys.detail(pathId), (path) =>
    path ? { ...path, steps: path.steps.map((s) => (s.id === stepId ? update(s) : s)) } : path,
  );
}

export function applyPatch(step: PathStep, patch: StepPatchRequest): PathStep {
  return {
    ...step,
    status: patch.status ?? step.status,
    difficulty: patch.difficulty ?? step.difficulty,
    actions: step.actions.map((a) => ({ ...a, done: patch.actionsDone?.find((d) => d.n === a.n)?.done ?? a.done })),
  };
}

interface StepPatchVars {
  stepId: string;
  patch: StepPatchRequest;
}

/** Optimistic step update (action ticks, difficulty, status); rolls back with a toast on error. */
export function useUpdateStep(pathId: string) {
  const client = useQueryClient();
  return useMutation<PathStep, ApiError, StepPatchVars, { previous: Path | undefined }>({
    mutationFn: ({ stepId, patch }) => updateStep(stepId, patch),
    onMutate: async ({ stepId, patch }) => {
      await client.cancelQueries({ queryKey: pathKeys.detail(pathId) });
      const previous = client.getQueryData<Path>(pathKeys.detail(pathId));
      replaceStep(client, pathId, stepId, (step) => applyPatch(step, patch));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) client.setQueryData(pathKeys.detail(pathId), context.previous);
      toast({ title: 'Could not save that', description: 'Your change was undone. Try again.', tone: 'error' });
    },
    onSuccess: (step) => {
      replaceStep(client, pathId, step.id, () => step);
    },
  });
}

interface SwapVars {
  resourceId: string;
  stepId: string;
  reason?: string;
}

/** US-07: swap a resource; the server keeps stage, Bloom tag and topic and logs the dislike. */
export function useSwapResource(pathId: string) {
  const client = useQueryClient();
  return useMutation<PathStep, ApiError, SwapVars>({
    mutationFn: ({ resourceId, stepId, reason }) => swapResource(resourceId, reason ? { stepId, reason } : { stepId }),
    onSuccess: (step) => {
      replaceStep(client, pathId, step.id, () => step);
      toast({ title: 'Swapped for another resource', tone: 'success' });
    },
    onError: (error) => {
      toast(
        error.code === 'NO_REPLACEMENT'
          ? { title: 'No other resource fits this step yet', tone: 'info' }
          : { title: 'Could not swap that resource', description: 'Try again in a moment.', tone: 'error' },
      );
    },
  });
}

/** FR-22 thumbs and difficulty feedback; the caller shows the choice optimistically. */
export function useSendFeedback() {
  return useMutation<unknown, ApiError, FeedbackRequest>({ mutationFn: sendFeedback });
}
