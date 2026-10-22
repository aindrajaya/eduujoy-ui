import { describe, expect, it } from 'vitest';
import { env } from '@/lib/env';
import {
  mockCheckpointResult,
  mockCostMetrics,
  mockDiagnosticCompleted,
  mockDiagnosticResume,
  mockJobAccepted,
  mockMe,
  mockPath,
  mockProgress,
  mockReviewQueue,
} from '../mocks/data';
import { http } from '../mocks/handlers';
import { server } from '../mocks/server';
import * as admin from './admin';
import * as auth from './auth';
import * as billing from './billing';
import * as checkpoints from './checkpoints';
import * as diagnostics from './diagnostics';
import * as health from './health';
import * as paths from './paths';
import * as progress from './progress';
import * as steps from './steps';
import * as topics from './topics';

describe('endpoints', () => {
  it('auth: me, login, register, logout', async () => {
    await expect(auth.getMe()).resolves.toEqual(mockMe);
    await expect(auth.login({ email: 'a@b.co', password: 'secret-pass' })).resolves.toEqual(mockMe);
    await expect(auth.register({ email: 'a@b.co', password: 'secret-pass' })).resolves.toEqual(mockMe);
    await expect(auth.logout()).resolves.toBeUndefined();
  });

  it('auth: builds the Google redirect URL on the API host', () => {
    expect(auth.googleSignInUrl()).toBe(`${env.apiUrl}/v1/auth/google`);
    expect(auth.googleSignInUrl('/steps/2')).toBe(`${env.apiUrl}/v1/auth/google?returnTo=%2Fsteps%2F2`);
    // Contract 0.8.0: a fresh sign-in for a sensitive action.
    expect(auth.googleSignInUrl('/account?delete=1', true)).toBe(
      `${env.apiUrl}/v1/auth/google?returnTo=%2Faccount%3Fdelete%3D1&reauth=true`,
    );
  });

  it('topics and diagnostics', async () => {
    await expect(topics.resolveTopic({ text: 'ux' })).resolves.toMatchObject({ status: 'matched' });
    await expect(
      diagnostics.startDiagnostic({ topicId: 'topic-ux', goal: 'Get hired', weeklyHours: 3 }),
    ).resolves.toMatchObject({ status: 'in_progress' });
    await expect(
      diagnostics.submitDiagnosticAnswers('diag-1', { answers: [{ itemId: 'q1', skipped: true }] }),
    ).resolves.toEqual(mockDiagnosticCompleted);
  });

  it('diagnostics: resume returns the outstanding batch; unknown ids 404', async () => {
    await expect(diagnostics.getDiagnostic('diag-1')).resolves.toEqual(mockDiagnosticResume);
    await expect(diagnostics.getDiagnostic('nope')).rejects.toMatchObject({ status: 404 });
  });

  it('paths: list passes query params, get maps 404 to ApiError', async () => {
    let query = '';
    server.use(
      http.get('/v1/paths', ({ request, response }) => {
        query = new URL(request.url).search;
        return response(200).json({ items: [], nextCursor: null });
      }),
    );
    await paths.listPaths({ status: 'active', topicId: 'topic-ux', limit: 10 });
    expect(query).toBe('?status=active&topicId=topic-ux&limit=10');
    await expect(paths.getPath(mockPath.id)).resolves.toEqual(mockPath);
    await expect(paths.getPath('missing')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('paths: create sends the Idempotency-Key', async () => {
    await expect(paths.createPath({ placementId: 'placement-1' }, 'key-12345678')).resolves.toEqual(
      mockJobAccepted,
    );
  });

  it('steps: patch, swap and feedback', async () => {
    const updated = await steps.updateStep('step-2', { actionsDone: [{ n: 2, done: true }] });
    expect(updated.actions.find((a) => a.n === 2)?.done).toBe(true);
    await expect(steps.swapResource('res-2-yt', { stepId: 'step-2' })).resolves.toMatchObject({ id: 'step-2' });
    await expect(
      steps.sendFeedback({ targetType: 'resource', targetId: 'res-2-yt', kind: 'up' }),
    ).resolves.toBeUndefined();
  });

  it('checkpoints: 200 is graded, 202 is a grading job', async () => {
    const body = { answers: [{ itemId: 'cp-2-1', optionIds: ['b'] }] };
    await expect(checkpoints.submitCheckpoint('step-2', body, 'key-12345678')).resolves.toEqual({
      kind: 'graded',
      result: mockCheckpointResult,
    });
    server.use(
      http.post('/v1/checkpoints/{id}/submissions', ({ response }) => response(202).json(mockJobAccepted)),
    );
    await expect(checkpoints.submitCheckpoint('step-2', body, 'key-12345678')).resolves.toEqual({
      kind: 'grading',
      job: mockJobAccepted,
    });
  });

  it('progress, billing, admin and health', async () => {
    await expect(progress.getProgress()).resolves.toEqual(mockProgress);
    await expect(progress.getProgressHistory('topic-ux')).resolves.toMatchObject({ topicId: 'topic-ux' });
    await expect(billing.createCheckout({ product: 'subscription' })).resolves.toMatchObject({
      url: expect.stringMatching(/^https:\/\//) as string,
    });
    await expect(admin.listReviewQueue({ status: 'open' })).resolves.toEqual(mockReviewQueue);
    await expect(admin.resolveReviewItem('review-1', { resolution: 'approved' })).resolves.toMatchObject({
      status: 'resolved',
      resolution: 'approved',
    });
    await expect(admin.getCostMetrics({ from: '2026-10-01' })).resolves.toEqual(mockCostMetrics);
    await expect(admin.getLatencyMetrics()).resolves.toMatchObject({ rows: expect.any(Array) as unknown[] });
    await expect(health.getHealth()).resolves.toMatchObject({ status: 'ok' });
  });

  it('encodes path segments', async () => {
    let seen = '';
    server.use(
      http.get('/v1/paths/{id}', ({ request, response }) => {
        seen = new URL(request.url).pathname;
        return response(200).json(mockPath);
      }),
    );
    await paths.getPath('a/b');
    expect(seen).toBe('/v1/paths/a%2Fb');
  });
});

describe('mock GET /v1/paths status filter', () => {
  it('returns only paths with the requested status', async () => {
    await expect(paths.listPaths({ status: 'active' })).resolves.toMatchObject({ items: [{ status: 'active' }] });
    await expect(paths.listPaths({ status: 'completed' })).resolves.toEqual({ items: [], nextCursor: null });
  });
});
