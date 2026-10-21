import type { Page, Route } from '@playwright/test';
import { mockMe, mockProblem } from '../src/api/mocks/data';
import type { Me, Problem } from '../src/api/types';

export const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

export const problem = (route: Route, body: Problem) =>
  route.fulfill({ status: body.status, contentType: 'application/problem+json', body: JSON.stringify(body) });

const unauthorized = mockProblem(401, 'UNAUTHENTICATED', 'Sign in required');

/** A tiny stateful fake of the auth endpoints; `signedIn` flips on login and logout. */
export async function mockAuth(page: Page, options: { signedIn: boolean; me?: Me }) {
  const state = { signedIn: options.signedIn, me: options.me ?? mockMe };

  await page.route('**/v1/auth/me', (route) =>
    state.signedIn ? json(route, 200, state.me) : problem(route, unauthorized),
  );
  await page.route('**/v1/auth/refresh', (route) =>
    state.signedIn ? route.fulfill({ status: 204 }) : problem(route, unauthorized),
  );
  await page.route('**/v1/auth/login', async (route) => {
    const body = route.request().postDataJSON() as { password?: string };
    if (body.password !== 'correct-horse-battery') {
      return problem(route, mockProblem(401, 'UNAUTHENTICATED', 'Invalid credentials'));
    }
    state.signedIn = true;
    return json(route, 200, state.me);
  });
  await page.route('**/v1/auth/logout', (route) => {
    state.signedIn = false;
    return route.fulfill({ status: 204 });
  });
  return state;
}
