// U11: learners must never download staff code. Fails the build check if any chunk reachable from
// a learner screen (the entry, or any lazy screen that is not itself staff) contains staff code.
// Staff code is recognised by the marker that src/features/admin/staffChunk.ts sets, so code that
// a chunk merge moved into a shared chunk is caught too. Run after `pnpm build` (reads dist/).
import { existsSync, readFileSync } from 'node:fs';

const DIST = process.argv[2] ?? 'dist';
const MARKER = '__eduujoyStaffCode';
const manifestPath = `${DIST}/.vite/manifest.json`;
if (!existsSync(manifestPath)) {
  console.error(`check-staff-chunks: ${manifestPath} not found; run pnpm build first`);
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const chunks = Object.entries(manifest).filter(([, chunk]) => chunk.file.endsWith('.js'));
const holdsStaff = new Map(chunks.map(([key, chunk]) => [key, readFileSync(`${DIST}/${chunk.file}`, 'utf8').includes(MARKER)]));

const staffKeys = [...holdsStaff].filter(([, staff]) => staff).map(([key]) => key);
if (staffKeys.length === 0) {
  console.error(`check-staff-chunks: no chunk carries ${MARKER}; did staffChunk.ts move?`);
  process.exit(2);
}

// Learner roots: the entry and every lazy screen that is not a staff screen (staff screens live in
// src/features/admin/ and may get the marker from a chunk they import).
const STAFF_SRC = 'src/features/admin/';
const isStaffScreen = (key, chunk) => holdsStaff.get(key) || (chunk.src ?? key).startsWith(STAFF_SRC);
const roots = chunks
  .filter(([key, chunk]) => (chunk.isEntry || chunk.isDynamicEntry) && !isStaffScreen(key, chunk))
  .map(([key]) => key);

const leaks = [];
for (const root of roots) {
  const seen = new Set();
  const stack = [root];
  while (stack.length) {
    const key = stack.pop();
    if (seen.has(key)) continue;
    seen.add(key);
    if (holdsStaff.get(key)) leaks.push(`${manifest[root].src ?? root} → ${manifest[key].file}`);
    stack.push(...(manifest[key].imports ?? []));
  }
}

if (leaks.length) {
  console.error(`check-staff-chunks: staff code is reachable from learner screens:\n  ${leaks.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-staff-chunks: ${roots.length} learner roots, none reaches staff code (${staffKeys.length} staff chunk(s))`);
