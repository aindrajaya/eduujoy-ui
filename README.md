# Eduujoy UI

React single-page app for Eduujoy, built with Vite and deployed to Vercel at
`https://eduujoy.aindrajaya.my.id`. It renders screens and talks only to the Eduujoy API
(`https://api.eduujoy.aindrajaya.my.id`); it holds no business rules and no secrets.

- Product spec: `../docs/PRD-MASTER.md`
- UI spec: `docs/PRD-UI.md` (stack, routes, budgets, slice plan)
- API contract: `docs/openapi.json`
- Slice status: `../docs/status/ui.md`

## Stack

Vite, React 19, TypeScript (strict), React Router data router with lazy routes,
Tailwind CSS 4, Vitest with Testing Library and axe-core. See PRD-UI §2 for the rest
(TanStack Query, Axios, MSW and Playwright arrive in later slices).

## Getting started

Requires Node 22+ and pnpm (version pinned in `package.json`).

```bash
pnpm install
cp env.example .env.local     # public values only
pnpm dev                     # http://localhost:5173
VITE_API_MOCKS=true pnpm dev # same, against the contract-typed MSW mocks (no API needed)
```

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server |
| `pnpm build` | Production build to `dist/` |
| `pnpm preview` | Serve the built app on port 4173 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (unit and component tests, including axe checks) |
| `pnpm test:coverage` | Tests with V8 coverage (`coverage/`) |
| `pnpm size` | JS budgets after `pnpm build`: initial ≤ 150 KB, any chunk ≤ 60 KB gzip |
| `pnpm test:e2e` | Playwright on a production build with the API mocked via `page.route` (system Chrome) |
| `pnpm build:lh` | Production bundle for Lighthouse (`dist-lh/`); `vite preview --mode lighthouse` answers the API from mock data |
| `pnpm lhci` | Lighthouse CI on the `build:lh` bundle (runs in CI) |

CI (`.github/workflows/ci.yml`) runs API types → lint → typecheck → tests → build → size → Playwright → Lighthouse.
Design tokens (colour roles, radii, motion; light and dark) live in `src/ui/tokens.css`.

## Layout

```text
src/
  main.tsx  router.tsx      # entry and lazy route table
  app/                      # root and tab layouts, not-found
  features/<area>/          # components/, page components, types
  ui/                       # shared presentational components
  lib/                      # framework-free helpers
  fixtures/                 # static demo data (until the API module lands)
  test/                     # test setup, axe helper, route renderer
```

## Security

- Every `VITE_*` variable is public once bundled. Never add secrets.
- No tokens or session data in browser storage; auth state comes from `/v1/auth/me`.
- `scripts/security-scan.mjs` statically scans tracked files for hidden or obfuscated code
  and runs in CI.
- Dependency install scripts are off by default (`pnpm-workspace.yaml` `allowBuilds`).

## Supply chain

How dependencies and CI are kept from running code we did not review:

- **Frozen lockfile.** CI installs with `pnpm install --frozen-lockfile`; a change to
  `pnpm-lock.yaml` only lands through a reviewed commit.
- **Install scripts denied.** `pnpm-workspace.yaml` `allowBuilds` lists packages whose build
  scripts stay off (`esbuild`, `msw`); pnpm runs no dependency lifecycle scripts unless allowed.
- **Pinned package manager.** `packageManager: pnpm@12.11.2` in `package.json`; CI's
  `pnpm/action-setup` reads the version from there.
- **Release age (pending).** `minimumReleaseAge: 10080` (7 days) refuses package versions newer
  than a week; pnpm 12.11.2 supports it. It is not switched on yet: `vitest` and
  `@vitest/coverage-v8` 4.1.12 and `typescript-eslint` 8.72.0 are pinned at versions younger than
  7 days, so the frozen install would fail. See `../docs/status/ui.md`.
- **`pnpm audit`.** Runs in the security-scan workflow (`--audit-level high`) against the
  lockfile; nothing is installed.
- **security-scan.** `scripts/security-scan.mjs` statically scans tracked files for hidden or
  obfuscated code (workflow `security-scan.yml`).
- **polinrider-guard.** `.github/scripts/polinrider_guard.py` scans git objects for PolinRider /
  BeaverTail malware indicators (kit files, payload markers, C2 addresses, base64 eval, hidden
  padding, VS Code autorun tasks, fake fonts) on every push and PR and weekly across all
  branches. It reads git objects only and never runs repo code. Run it locally with
  `python3 -I .github/scripts/polinrider_guard.py --all-branches`. It overlaps with
  security-scan, but each has rules the other lacks.
- **SHA-pinned actions.** Every third-party action in `.github/workflows/` is pinned to a full
  commit SHA, with the version in a comment.
