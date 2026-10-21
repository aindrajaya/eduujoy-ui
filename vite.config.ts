import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** Dev server only: serves MSW's worker from the installed package, so it never ships in dist/. */
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

export default defineConfig({
  plugins: [react(), tailwindcss(), mswWorker()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
  build: { target: 'es2022', sourcemap: false, manifest: true },
  test: {
    environment: 'jsdom',
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
});
