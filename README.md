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
| `pnpm build:mock` | Production-like build that runs against the MSW mocks (`dist-mock/`, Lighthouse only) |
| `pnpm lhci` | Lighthouse CI on the mock build (needs Chrome and a display; runs in CI) |

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
