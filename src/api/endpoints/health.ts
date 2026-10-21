import { api } from '../client';
import type { HealthResponse } from '../types';

/** Liveness ping; U3 uses it for the "Waking up the server…" state. */
export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health', { signal });
  return data;
}
