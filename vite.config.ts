import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { mockMe, mockPath, mockProblem } from './src/api/mocks/data';

/** `vite dev` only: serves MSW's worker from the installed package, so it never ships in dist/. */
function mswWorker(): Plugin {
  return {
    name: 'eduujoy:msw-worker',
    apply: 'serve',
    configureServer(server) {
      const file = fileURLToPath(import.meta.resolve('msw/mockServiceWorker.js'));
      server.middlewares.use('/mockServiceWorker.js', (_req, res) => {
        res.setHeader('Content-Type', 'text/javascript');
        res.end(readFileSync(file));
      });
    },
  };
}

/**
 * `vite preview --mode lighthouse` only: answers the API on the preview origin from the typed mock
 * data, so Lighthouse audits the real production bundle (no MSW in the page). A page loaded with
 * `?mock=signed-out` (seen via Referer) gets a signed-out session, to audit /signin.
 */
function lighthouseApi(): Plugin {
  return {
    name: 'eduujoy:lighthouse-api',
    configurePreviewServer(server) {
      if (server.config.mode !== 'lighthouse') return;
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] ?? '';
        if (!path.startsWith('/v1/')) {
          next();
          return;
        }
        const send = (status: number, body?: unknown) => {
          res.statusCode = status;
          if (body === undefined) {
            res.end();
            return;
          }
          const problem = status >= 400;
          res.setHeader('Content-Type', problem ? 'application/problem+json' : 'application/json');
          res.end(JSON.stringify(body));
        };
        const signedOut = (req.headers.referer ?? '').includes('mock=signed-out');
        const unauthorized = mockProblem(401, 'UNAUTHENTICATED', 'Sign in required');
        if (path === '/v1/auth/me') {
          send(signedOut ? 401 : 200, signedOut ? unauthorized : mockMe);
        } else if (path === '/v1/auth/refresh') {
          send(signedOut ? 401 : 204, signedOut ? unauthorized : undefined);
        } else if (path === '/v1/paths') {
          // A PathSummary, as the API sends it: the list never carries steps.
          const summary = Object.fromEntries(Object.entries(mockPath).filter(([key]) => key !== 'steps'));
          send(200, { items: [summary], nextCursor: null });
        } else if (path === `/v1/paths/${mockPath.id}`) {
          send(200, mockPath);
        } else {
          send(404, mockProblem(404, 'NOT_FOUND', 'Not mocked for Lighthouse'));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), mswWorker(), lighthouseApi()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    sourcemap: false,
    manifest: true,
    // Merge sub-8 KB chunks (icons, tiny shared modules) into their importers: each request costs a
    // round trip on mobile, which Lighthouse measured as +160 ms LCP on /today (PRD-UI §9).
    rollupOptions: { output: { experimentalMinChunkSize: 8_000 } },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/fixtures/**', 'src/main.tsx', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'html', 'lcov'],
      // PRD-UI §10: the API error mapper (and the quiz reducer, U5) need 100% branch coverage.
      thresholds: {
        'src/api/errors.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
        'src/features/quiz/reducer.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
      },
    },
  },
});
