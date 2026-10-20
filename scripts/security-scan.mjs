// Static scan for hidden or obfuscated code in tracked files.
// Reads files only; never imports or executes repository code.
// Run: node scripts/security-scan.mjs   (no npm install needed)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";

const SELF = "scripts/security-scan.mjs";
const MAX_LINE_LENGTH = 1000;

// Files that are allowed to have long lines (generated or minified-by-nature).
const LONG_LINE_EXEMPT = [/^package-lock\.json$/, /\.svg$/i, /\.ico$/i];

const SUSPICIOUS = [
  { name: "global.i marker", re: /\bglobal\s*(?:\.\s*i|\[\s*["'`]i["'`]\s*\])\s*=/ },
  { name: "eval call", re: /(^|[^\w$.])eval\s*\(/ },
  { name: "new Function", re: /\bnew\s+Function\s*\(/ },
  { name: "child_process", re: /["'`](?:node:)?child_process["'`]/ },
  { name: "detached spawn", re: /\bdetached\s*:\s*(?:true|!0|!\()/ },
  { name: "createRequire", re: /\bcreateRequire\s*\(/ },
  { name: "obfuscator identifier", re: /\b_0x[a-f0-9]{4,}\b/i },
  { name: "Ethereum RPC call", re: /\beth_(?:getBlockByNumber|getTransactionCount|blockNumber|call|getLogs)\b/ },
];

// Build-time config files: should never touch the network or processes.
const CONFIG_FILE = /^(?:postcss|tailwind|next|vite|webpack|rollup|eslint|babel|jest|vitest|prisma)\.config\.[cm]?[jt]s$/;
const CONFIG_NETWORK = [
  /\bfetch\s*\(/,
  /\bhttps?\s*\.\s*(?:request|get)\s*\(/,
  /["'`](?:node:)?(?:http|https|net|dns|zlib)["'`]/,
  /\baxios\b/,
];

const CODE_EXT = new Set([".js", ".mjs", ".cjs", ".jsx", ".ts", ".mts", ".cts", ".tsx"]);
const ENCODED_BLOB = /[A-Za-z0-9+/]{200,}={0,2}/;

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const findings = [];
const add = (file, line, rule, text = "") =>
  findings.push(`${file}:${line}: ${rule}${text ? ` — ${text.trim().slice(0, 120)}` : ""}`);

for (const file of files) {
  let buf;
  try {
    buf = readFileSync(file);
  } catch {
    continue; // deleted in working tree
  }
  if (buf.includes(0)) continue; // binary

  const name = basename(file);
  const ext = extname(file).toLowerCase();
  const isSelf = file === SELF;
  const isConfig = CONFIG_FILE.test(name);
  const longLineExempt = LONG_LINE_EXEMPT.some((re) => re.test(file));

  buf.toString("utf8").split(/\r?\n/).forEach((line, i) => {
    const n = i + 1;

    // Long lines are checked everywhere, including this file, so the
    // scanner itself can't be used to hide a payload.
    if (!longLineExempt && line.length > MAX_LINE_LENGTH) {
      add(file, n, `long line (${line.length} chars)`);
    }
    // Trailing whitespace runs are how the original payload was hidden.
    if (/\S[ \t]{100,}\S/.test(line)) {
      add(file, n, "long whitespace run followed by code", line.replace(/\s{2,}/g, " ⟶ "));
    }

    if (isSelf) return; // pattern rules would match their own definitions

    for (const { name: rule, re } of SUSPICIOUS) {
      if (re.test(line)) add(file, n, rule, line);
    }
    if (isConfig && CONFIG_NETWORK.some((re) => re.test(line))) {
      add(file, n, "network access in build config", line);
    }
    if (CODE_EXT.has(ext) && ENCODED_BLOB.test(line)) {
      add(file, n, "long encoded-looking string", line);
    }
  });
}

if (findings.length) {
  console.error(`Security scan: ${findings.length} finding(s)\n`);
  for (const f of findings) console.error(`- ${f}`);
  console.error("\nReview each finding. Do not exempt one without understanding it.");
  process.exitCode = 1;
} else {
  console.log(`Security scan: ${files.length} tracked files, no findings.`);
}
