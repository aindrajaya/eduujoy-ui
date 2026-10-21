// Performance budgets (PRD-UI §9), computed from the Vite manifest after `pnpm build`:
// - initial JS per first screen: entry chunk + its static imports + that screen's chunks, <= 150 KB
//   gzip, for /signin (signed out) and /today (signed in)
// - every other JS chunk, <= 60 KB gzip
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));

// Source modules that render each possible first screen.
const FIRST_SCREENS = {
  '/signin (signed out)': ['src/app/RootLayout.tsx', 'src/auth/SignInPage.tsx'],
  '/today (signed in)': ['src/app/RootLayout.tsx', 'src/app/TabsLayout.tsx', 'src/features/paths/TodayPage.tsx'],
};

const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
if (!entryKey) throw new Error('No entry chunk in dist/.vite/manifest.json');

function withStaticImports(key, seen = new Set()) {
  if (seen.has(key)) return seen;
  seen.add(key);
  for (const dep of manifest[key].imports ?? []) withStaticImports(dep, seen);
  return seen;
}

function initialKeys(screen) {
  const keys = new Set();
  for (const key of [entryKey, ...screen]) {
    if (!manifest[key]) throw new Error(`${key} is not a chunk; update FIRST_SCREENS`);
    withStaticImports(key, keys);
  }
  return [...keys];
}

const file = (key) => `dist/${manifest[key].file}`;
const jsChunks = Object.keys(manifest).filter((k) => manifest[k].file.endsWith('.js'));

export default [
  ...Object.entries(FIRST_SCREENS).map(([name, screen]) => ({
    name: `Initial JS, ${name}`,
    path: initialKeys(screen).map(file),
    limit: '150 KB',
    gzip: true,
  })),
  ...jsChunks
    .filter((k) => k !== entryKey)
    .map((k) => ({ name: `Chunk ${manifest[k].name ?? k}`, path: file(k), limit: '60 KB', gzip: true })),
];
