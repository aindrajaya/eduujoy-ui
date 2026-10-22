import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { createPath } from '@/api/endpoints/paths';
import type { ApiError } from '@/api/errors';
import type { JobAccepted, PathCreateRequest } from '@/api/types';

/**
 * Starts path generation (US-03). One Idempotency-Key per screen visit, so repeated taps or a
 * retry after a lost response never start a second generation.
 */
export function useCreatePath() {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  return useMutation<JobAccepted, ApiError, PathCreateRequest>({
    mutationFn: (body) => createPath(body, idempotencyKey),
  });
}
