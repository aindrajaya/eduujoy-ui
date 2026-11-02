# Third-party licences

Fonts self-hosted in `src/ui/sketch/fonts/` (Eduujoy Sketch design system, PRD-UI §4b). Both are byte-identical copies of `../docs/design-system/fonts/`.

| File | Family | Licence | SHA-256 |
| --- | --- | --- | --- |
| `Excalifont-Regular-latin.woff2` | Excalifont (latin subset) | SIL Open Font License 1.1, [`Excalifont-OFL.txt`](Excalifont-OFL.txt) | `e4423b318e11432aff2e6e865e300b7ca270f92321a3f56632268fede01c1b48` |
| `Nunito-latin-wght.woff2` | Nunito variable, weights 200–1000 (latin subset) | SIL Open Font License 1.1, [`Nunito-OFL.txt`](Nunito-OFL.txt) | `ba344451eab25b217a165363b1982048a5e5830a0daf36577973955a04cac793` |

Where the texts come from (fetched 22 Oct 2026):

- **Nunito:** the Nunito project's own licence file, unchanged: https://raw.githubusercontent.com/googlefonts/nunito/main/OFL.txt
- **Excalifont:** the font's page says "OFL-1.1 license (included in the font file)" and publishes no separate text (https://plus.excalidraw.com/excalifont). The text is SIL's canonical OFL 1.1 (https://openfontlicense.org/documents/OFL.txt), with the copyright line from the font's metadata as shipped in the Excalidraw repo (`packages/excalidraw/fonts/Excalifont/index.ts`: "Copyright (c) 2024 by Excalidraw").

## JavaScript: rough.js (U12b, PRD-UI §4b)

`roughjs` 4.6.6 (exact pin) draws the progress grid's "now" cell and the empty-state rings, in a lazy chunk only. Its ESM bundle inlines its four dependencies, so all five notices ship. Each text is the package's own `LICENSE`, unchanged, from the npm tarball reviewed on 2 Nov 2026 (lead-approved; review in `../docs/status/ui.md`).

| Package | Version | Licence | Copyright |
| --- | --- | --- | --- |
| `roughjs` | 4.6.6 | MIT, [`roughjs-MIT.txt`](roughjs-MIT.txt) | 2019 Preet Shihn |
| `hachure-fill` | 0.5.2 | MIT, [`hachure-fill-MIT.txt`](hachure-fill-MIT.txt) | 2023 Preet Shihn |
| `path-data-parser` | 0.1.0 | MIT, [`path-data-parser-MIT.txt`](path-data-parser-MIT.txt) | 2020 Preet Shihn |
| `points-on-curve` | 0.2.0 | MIT, [`points-on-curve-MIT.txt`](points-on-curve-MIT.txt) | 2020 Preet Shihn |
| `points-on-path` | 0.2.1 | MIT, [`points-on-path-MIT.txt`](points-on-path-MIT.txt) | 2020 Preet Shihn |
