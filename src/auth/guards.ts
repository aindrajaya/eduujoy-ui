import type { QueryClient } from '@tanstack/react-query';
import { redirect } from 'react-router';
import type { Me, Role } from '@/api/types';
import { queryClient as appQueryClient } from '@/query-client';
import { hasRole, sessionQuery } from './session';

export const HOME = '/today';

/** Only same-origin absolute paths are allowed as post-sign-in targets (no open redirects). */
export function safeNext(raw: string | null | undefined): string {
  if (!raw?.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return HOME;
  return raw;
}

export function signInUrl(request: Request, extra: Record<string, string> = {}): string {
  const { pathname, search } = new URL(request.url);
  const params = new URLSearchParams({ next: pathname + search, ...extra });
  return `/signin?${params.toString()}`;
}

/** Resolves the session from cache (refetched once older than 5 min), shared by every guard. */
export function loadSession(client: QueryClient = appQueryClient): Promise<Me | null> {
  return client.query(sessionQuery);
}

/** Loader guard: signed out → /signin?next=… before any protected component renders. */
export async function requireAuth(request: Request, client?: QueryClient): Promise<Me> {
  const me = await loadSession(client);
  if (!me) throw redirect(signInUrl(request));
  return me;
}

/** Loader guard for reviewer/admin routes. The API enforces roles regardless. */
export async function requireRole(
  request: Request,
  roles: readonly Role[],
  client?: QueryClient,
): Promise<Me> {
  const me = await requireAuth(request, client);
  if (!hasRole(me, roles)) {
    throw new Response('You do not have access to this page.', { status: 403 });
  }
  return me;
}

/** Loader guard for /signin and /signup: signed-in users go straight to `next` or Today. */
export async function publicOnly(request: Request, client?: QueryClient): Promise<null> {
  const me = await loadSession(client);
  if (me) throw redirect(safeNext(new URL(request.url).searchParams.get('next')));
  return null;
}
