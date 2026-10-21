import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const workerFile = () => fileURLToPath(import.meta.resolve('msw/mockServiceWorker.js'));

/**
 * Serves MSW's worker from the installed package in `vite dev`, and emits it only into
 * `--mode mock` builds (Lighthouse CI). Production builds never contain it.
 */
function mswWorker(mode: string): Plugin {
  return {
    name: 'eduujoy:msw-worker',
    configureServer(server) {
      server.middlewares.use('/mockServiceWorker.js', (_req, res) => {
        res.setHeader('Content-Type', 'text/javascript');
        res.end(readFileSync(workerFile()));
      });
    },
    generateBundle() {
      if (mode !== 'mock') return;
      this.emitFile({ type: 'asset', fileName: 'mockServiceWorker.js', source: readFileSync(workerFile()) });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), mswWorker(mode)],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
  build: { target: 'es2022', sourcemap: false, manifest: true },
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
      },
    },
  },
}));
