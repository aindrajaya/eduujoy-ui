// Prints why each audited screen's LCP is what it is, from Lighthouse CI's own reports
// (.lighthouseci/lhr-*.json): the median run's LCP and its phases, server response time, and the
// requests and bytes before LCP. Runs after `pnpm lhci`, even when it fails, so a CI log is enough
// to compare GitHub's runners with a local run. Reads local files only; nothing is uploaded.
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const DIR = process.argv[2] ?? '.lighthouseci';
if (!existsSync(DIR)) {
  console.log(`lh-summary: ${DIR} not found`);
  process.exit(0);
}

const runs = readdirSync(DIR)
  .filter((f) => /^lhr-.*\.json$/.test(f))
  .map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')));

const byUrl = new Map();
for (const lhr of runs) {
  const list = byUrl.get(lhr.requestedUrl) ?? [];
  list.push(lhr);
  byUrl.set(lhr.requestedUrl, list);
}

const ms = (n) => `${Math.round(n)} ms`;
for (const [url, list] of byUrl) {
  list.sort((a, b) => a.audits['largest-contentful-paint'].numericValue - b.audits['largest-contentful-paint'].numericValue);
  const lhr = list[Math.floor(list.length / 2)];
  const a = lhr.audits;
  const phases = a['largest-contentful-paint-element']?.details?.items?.[1]?.items ?? [];
  const observed = a.metrics?.details?.items?.[0] ?? {};
  const requests = a['network-requests']?.details?.items ?? [];
  const beforeLcp = requests.filter((r) => r.networkRequestTime <= (observed.observedLargestContentfulPaint ?? Infinity));
  const kb = (list) => (list.reduce((sum, r) => sum + (r.transferSize ?? 0), 0) / 1024).toFixed(1);
  console.log(`\n${url}  (median of ${list.length}, benchmarkIndex ${lhr.environment?.benchmarkIndex ?? '?'})`);
  console.log(`  LCP ${ms(a['largest-contentful-paint'].numericValue)}  FCP ${ms(a['first-contentful-paint'].numericValue)}  TBT ${ms(a['total-blocking-time'].numericValue)}  server response ${ms(a['server-response-time']?.numericValue ?? 0)}`);
  console.log(`  LCP phases: ${phases.map((p) => `${p.phase} ${ms(p.timing)}`).join(', ') || 'n/a'}`);
  console.log(`  requests before LCP: ${beforeLcp.length} (${kb(beforeLcp)} KB of ${requests.length} / ${kb(requests)} KB)`);
  console.log(`  main thread: ${(a['mainthread-work-breakdown']?.details?.items ?? []).map((i) => `${i.group} ${ms(i.duration)}`).join(', ')}`);
}
