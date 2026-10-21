// Performance budgets (PRD-UI §9), computed from the Vite manifest after `pnpm build`:
// - initial JS: entry chunk + its static imports + the first route ("/" redirects to /start), <= 150 KB gzip
// - every other JS chunk, <= 60 KB gzip
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));

// Source modules that render the first screen.
const FIRST_ROUTE = ['src/app/RootLayout.tsx', 'src/features/onboarding/StartPage.tsx'];

const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
if (!entryKey) throw new Error('No entry chunk in dist/.vite/manifest.json');

function withStaticImports(key, seen = new Set()) {
  if (seen.has(key)) return seen;
  seen.add(key);
  for (const dep of manifest[key].imports ?? []) withStaticImports(dep, seen);
  return seen;
}

const initialKeys = new Set();
for (const key of [entryKey, ...FIRST_ROUTE]) {
  if (!manifest[key]) throw new Error(`${key} is not a chunk; update FIRST_ROUTE`);
  withStaticImports(key, initialKeys);
}

const file = (key) => `dist/${manifest[key].file}`;
const jsChunks = Object.keys(manifest).filter((k) => manifest[k].file.endsWith('.js'));

export default [
  { name: 'Initial JS (shell + first route)', path: [...initialKeys].map(file), limit: '150 KB', gzip: true },
  ...jsChunks
    .filter((k) => k !== entryKey)
    .map((k) => ({ name: `Chunk ${manifest[k].name ?? k}`, path: file(k), limit: '60 KB', gzip: true })),
];
