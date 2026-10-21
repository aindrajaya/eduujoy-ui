import { describe, expect, it } from 'vitest';
import { mockMe, mockProblem } from '@/api/mocks/data';
import { http, problemResponse } from '@/api/mocks/handlers';
import { server } from '@/api/mocks/server';
import { createQueryClient } from '@/query-client';
import { publicOnly, requireAuth, requireRole, safeNext, signInUrl } from './guards';
import { fetchSession, hasRole, sessionKeys } from './session';

const req = (path: string) => new Request(`http://localhost${path}`);

function signedOut() {
  server.use(
    http.get('/v1/auth/me', ({ response }) =>
      response.untyped(problemResponse(mockProblem(401, 'UNAUTHENTICATED', 'Sign in'))),
    ),
    http.post('/v1/auth/refresh', ({ response }) =>
      response.untyped(problemResponse(mockProblem(401, 'UNAUTHENTICATED', 'Sign in'))),
    ),
  );
}

async function thrown(promise: Promise<unknown>): Promise<Response> {
  try {
    await promise;
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
  throw new Error('expected the guard to throw');
}

describe('fetchSession', () => {
  it('returns the user when signed in', async () => {
    await expect(fetchSession()).resolves.toEqual(mockMe);
  });

  it('returns null on 401 after the refresh also fails', async () => {
    signedOut();
    await expect(fetchSession()).resolves.toBeNull();
  });

  it('still throws non-auth failures', async () => {
    server.use(
      http.get('/v1/auth/me', ({ response }) =>
        response.untyped(problemResponse(mockProblem(503, 'INTERNAL', 'Down'))),
      ),
    );
    await expect(fetchSession()).rejects.toMatchObject({ status: 503 });
  });
});

describe('safeNext', () => {
  it.each([
    [null, '/today'],
    ['', '/today'],
    ['https://evil.example', '/today'],
    ['//evil.example', '/today'],
    ['/\\evil.example', '/today'],
    ['/steps/2?tab=a', '/steps/2?tab=a'],
  ])('%s → %s', (raw, expected) => {
    expect(safeNext(raw)).toBe(expected);
  });
});

describe('guards', () => {
  it('requireAuth returns the user and caches it for later guards', async () => {
    const client = createQueryClient();
    await expect(requireAuth(req('/today'), client)).resolves.toEqual(mockMe);
    expect(client.getQueryData(sessionKeys.me())).toEqual(mockMe);
  });

  it('requireAuth redirects to /signin with next when signed out', async () => {
    signedOut();
    const res = await thrown(requireAuth(req('/steps/2?x=1'), createQueryClient()));
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/signin?next=%2Fsteps%2F2%3Fx%3D1');
  });

  it('requireRole allows matching roles and 403s others', async () => {
    const client = createQueryClient();
    client.setQueryData(sessionKeys.me(), { ...mockMe, roles: ['learner', 'reviewer'] });
    await expect(requireRole(req('/admin'), ['reviewer', 'admin'], client)).resolves.toBeTruthy();

    client.setQueryData(sessionKeys.me(), mockMe);
    const res = await thrown(requireRole(req('/admin'), ['reviewer', 'admin'], client));
    expect(res.status).toBe(403);
  });

  it('publicOnly sends signed-in users to a safe next, and lets signed-out users through', async () => {
    const res = await thrown(publicOnly(req('/signin?next=%2Fprogress'), createQueryClient()));
    expect(res.headers.get('Location')).toBe('/progress');
    const evil = await thrown(publicOnly(req('/signin?next=%2F%2Fevil.example'), createQueryClient()));
    expect(evil.headers.get('Location')).toBe('/today');

    signedOut();
    await expect(publicOnly(req('/signin'), createQueryClient())).resolves.toBeNull();
  });

  it('builds sign-in URLs with extra params', () => {
    expect(signInUrl(req('/today'), { expired: '1' })).toBe('/signin?next=%2Ftoday&expired=1');
  });

  it('hasRole handles missing sessions', () => {
    expect(hasRole(null, ['admin'])).toBe(false);
    expect(hasRole(undefined, ['admin'])).toBe(false);
  });
});
