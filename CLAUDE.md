# Eduujoy UI (React)
Specs: ../docs/PRD-MASTER.md (product, wins on scope) and docs/PRD-UI.md (implementation).
API shapes come only from docs/openapi.json; refresh it with `pnpm api:sync` (copies ../api/openapi.json, regenerates types).
- One slice at a time: finish, verify, commit, update status, then start the next. Slices come from PRD-UI Section 11 in the order in ../docs/EXECUTION-PLAN.md; branch slice/U<n>-<name>; commit prefix `ui:`. Status lives in ../docs/status/ui.md.
- Frozen contract: ../docs/contract/openapi.v0.yaml (JSON copy: docs/openapi.json). Build MSW mocks from it until EXECUTION-PLAN says a slice switches to the real API; request changes under "Contract change requests" in ../docs/status/ui.md.
- Package manager is pnpm; do not commit package-lock.json or yarn.lock.
- Run git, pnpm and tests from inside ui/ (separate repo).
- Components call feature hooks in queries.ts, never axios directly.
- No tokens or session data in localStorage; auth state comes from /v1/auth/me only.
- Keep every route lazy; run size-limit before finishing.
- Run the slice's Verify commands; if the PRD is ambiguous, stop and list the question.
- Env: VITE_API_URL=https://api.eduujoy.aindrajaya.my.id; every request uses withCredentials: true.
