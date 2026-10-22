// U12a: restyled code uses design tokens only (design-system HANDOFF §6). Fails on, in the
// restyled scope:
// - Tailwind palette colours (bg-indigo-600, text-white, from-purple-700, ...);
// - raw colours (#hex, rgb(), hsl()) outside the generated token files;
// - arbitrary lengths in class names (p-[13px], min-w-[20rem]), except calc()/env()/var();
// - the display font (Excalifont: h1, font-display, sk-display-*, sk-annotation) below 18px, or on an
//   element whose content holds numbers (digits, or a count, step number, minutes, score...).
// Since U12a-4 the scope is all of src/ (it grew part by part).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SCOPE = [
  // U12a-4: everything; the restyle is complete.
  'index.html',
  'src',
];

// Generated from tokens.json, or brand marks that must keep their own colours.
const ALLOWED_FILES = new Set([
  'src/ui/sketch/tokens.css',
  'src/ui/sketch/fonts.css',
  'src/ui/sketch/theme.css',
  // Google's mark must keep its brand colours (Google sign-in branding guidelines).
  'src/auth/GoogleButton.tsx',
]);
// theme-color metas cannot read CSS variables; their values are tokens.json's bg.
const ALLOWED_LINE = /<meta name="theme-color"/;

const PALETTE =
  /\b(?:bg|text|border|from|via|to|ring|fill|stroke|shadow|outline|accent|divide|placeholder|decoration|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?(?:\/\d+)?\b/;
const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
const ARBITRARY_LENGTH = /-\[(?![^\]]*(?:calc|env|var)\()[^\]]*\d(?:px|rem|em)[^\]]*\]/;
const DISPLAY_CLASS = /\b(?:font-display|sk-display-(?:xl|lg|md)|sk-annotation)\b/;
const SMALL_SIZE = /\btext-(?:xs|sm|base)\b/;
// An opening tag set in the display font: any h1 (index.css), or a tag with a display class.
const DISPLAY_TAG = /<(h1)\b[^>]*>|<([a-z][a-z0-9]*)\b[^>]*className=["'`{][^>]*\b(?:font-display|sk-display-(?:xl|lg|md)|sk-annotation)\b[^>]*>/g;
// Numbers in the content: a digit in the text, or an expression that is a count, number or time.
const NUMERIC = /(?:^|>|\s)[^<{]*\d|\{[^}]*\b(?:n|count|total|done|answered|minutes|estMinutes|score|percent|progress|length)\b[^}]*\}/;

/** Display-font elements below 18px or holding numbers, found per tag (content up to its close). */
function displayProblems(file, text) {
  const found = [];
  for (const match of text.matchAll(DISPLAY_TAG)) {
    const tag = match[1] ?? match[2] ?? '';
    const start = (match.index ?? 0) + match[0].length;
    const end = text.indexOf(`</${tag}>`, start);
    const content = end === -1 ? '' : text.slice(start, end);
    const line = text.slice(0, match.index).split('\n').length;
    if (SMALL_SIZE.test(match[0])) found.push(`${file}:${String(line)}: display font below 18px`);
    if (NUMERIC.test(content)) found.push(`${file}:${String(line)}: display font on numbers`);
  }
  return found;
}

const files = (path) => {
  if (statSync(path).isFile()) return [path];
  return readdirSync(path).flatMap((name) => files(join(path, name)));
};

const problems = [];
for (const file of SCOPE.flatMap(files)) {
  if (!/\.(tsx?|css|html)$/.test(file) || /\.test\.tsx?$/.test(file) || ALLOWED_FILES.has(file)) continue;
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (ALLOWED_LINE.test(line) || /^\s*(\/\/|\*|\/\*)/.test(line)) return;
      const where = `${file}:${String(i + 1)}`;
      if (PALETTE.test(line)) problems.push(`${where}: palette colour ${line.match(PALETTE)?.[0] ?? ''}`);
      if (RAW_COLOUR.test(line)) problems.push(`${where}: raw colour ${line.match(RAW_COLOUR)?.[0] ?? ''}`);
      if (/\.tsx$|\.html$/.test(file) && ARBITRARY_LENGTH.test(line)) {
        problems.push(`${where}: raw length ${line.match(ARBITRARY_LENGTH)?.[0] ?? ''}`);
      }
      if (DISPLAY_CLASS.test(line) && SMALL_SIZE.test(line) && !/<h1\b/.test(line)) {
        problems.push(`${where}: display font below 18px`);
      }
    });
  if (/\.tsx$/.test(file)) problems.push(...displayProblems(file, readFileSync(file, 'utf8')));
}

if (problems.length) {
  console.error(`check-styles: ${String(problems.length)} problem(s)\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-styles: tokens only in ${SCOPE.join(', ')}`);
