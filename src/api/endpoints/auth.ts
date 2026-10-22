import { api } from '../client';
import type { LoginRequest, Me, RegisterRequest } from '../types';

export async function getMe(): Promise<Me> {
  const { data } = await api.get<Me>('/v1/auth/me');
  return data;
}

export async function login(body: LoginRequest): Promise<Me> {
  const { data } = await api.post<Me>('/v1/auth/login', body);
  return data;
}

export async function register(body: RegisterRequest): Promise<Me> {
  const { data } = await api.post<Me>('/v1/auth/register', body);
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/v1/auth/logout');
}

/**
 * Full-page redirect target for Google sign-in; the API sends the browser back to `returnTo`.
 * `reauth` (contract 0.8.0) asks Google for a fresh sign-in, for a sensitive action such as
 * deleting the account.
 */
export function googleSignInUrl(returnTo?: string, reauth = false): string {
  const url = new URL('/v1/auth/google', api.defaults.baseURL);
  if (returnTo) url.searchParams.set('returnTo', returnTo);
  if (reauth) url.searchParams.set('reauth', 'true');
  return url.toString();
}
