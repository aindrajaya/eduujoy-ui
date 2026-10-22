import { describe, expect, it } from 'vitest';
import spec from '../../../docs/openapi.json';
import { handlers } from './handlers';

// Operations the SPA never calls through Axios: OAuth redirects (full-page navigation),
// the Lemon Squeezy webhook (server to server) and readiness.
const NOT_MOCKED = new Set([
  'GET /v1/auth/google',
  'GET /v1/auth/google/callback',
  'POST /v1/billing/webhook',
  'GET /ready',
]);

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

function contractOperations(): string[] {
  const ops: string[] = [];
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of METHODS) {
      if (method in item) ops.push(`${method.toUpperCase()} ${path.replace(/\{(\w+)\}/g, ':$1')}`);
    }
  }
  return ops;
}

function handlerOperations(): string[] {
  return handlers.map((h) => {
    const { method, path } = h.info as { method: string; path: string };
    return `${method} ${new URL(path).pathname}`;
  });
}

describe('MSW handlers', () => {
  it('mock every contract operation the UI calls, and nothing outside the contract', () => {
    const expected = contractOperations().filter((op) => !NOT_MOCKED.has(op)).sort();
    expect(handlerOperations().sort()).toEqual(expected);
  });
});
