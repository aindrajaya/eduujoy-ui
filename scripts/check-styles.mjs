// U12a: restyled code uses design tokens only (design-system HANDOFF §6). Fails on, in the
// restyled scope:
// - Tailwind palette colours (bg-indigo-600, text-white, from-purple-700, ...);
// - raw colours (#hex, rgb(), hsl()) outside the generated token files;
// - arbitrary lengths in class names (p-[13px], min-w-[20rem]), except calc()/env()/var();
// - the display font (Excalifont) next to a size below 18px (text-xs, text-sm, text-base).
// The scope grows with each U12a part; at the end it is all of src/.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SCOPE = [
  // U12a-1: the shell and shared components (plus the demo, built on the sketch from the start).
  'index.html',
  'src/index.css',
  'src/app',
  'src/ui',
  'src/features/quiz',
  'src/features/demo',
];

// Generated from tokens.json, or brand marks that must keep their own colours.
const ALLOWED_FILES = new Set(['src/ui/sketch/tokens.css', 'src/ui/sketch/fonts.css', 'src/ui/sketch/theme.css']);
// theme-color metas cannot read CSS variables; their values are tokens.json's bg.
const ALLOWED_LINE = /<meta name="theme-color"/;

const PALETTE =
  /\b(?:bg|text|border|from|via|to|ring|fill|stroke|shadow|outline|accent|divide|placeholder|decoration|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?(?:\/\d+)?\b/;
const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
const ARBITRARY_LENGTH = /-\[(?![^\]]*(?:calc|env|var)\()[^\]]*\d(?:px|rem|em)[^\]]*\]/;
const SMALL_DISPLAY = /font-display[^"'`]*\btext-(?:xs|sm|base)\b|\btext-(?:xs|sm|base)\b[^"'`]*font-display/;

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
      if (SMALL_DISPLAY.test(line)) problems.push(`${where}: display font below 18px`);
    });
}

if (problems.length) {
  console.error(`check-styles: ${String(problems.length)} problem(s)\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`check-styles: tokens only in ${SCOPE.join(', ')}`);
