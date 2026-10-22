# Eduujoy — UI PRD (React)

Oct 21, 2026 · @Arista Indra

## 1. Scope

The front end is the existing React codebase, kept as its own repository and deployed to Vercel as a single-page app. It renders, collects input and talks only to the Eduujoy API; it holds no business rules and no secrets.

**Document hierarchy**

1. [Master PRD](https://claude.ai/artifact/BGaNeyavYS9oNGGk4zEGWY): product, user stories (US-xx), functional requirements (FR-xx). It wins on any conflict.
2. [API PRD](https://claude.ai/artifact/2hFY3AbqXzA13eGMJTWhsE): endpoints, errors, SSE and WebSocket events this UI consumes.
3. **UI PRD (this doc):** how the front end implements the master PRD.

**How Claude Code uses this doc**

- Workspace layout: `eduujoy/docs/PRD-MASTER.md` at the root, this file at `eduujoy/ui/docs/PRD-UI.md`, and `eduujoy/ui/CLAUDE.md` beside the code. `ui/` is its own git repository.
- API types come from `ui/docs/openapi.json`, a committed copy of `api/openapi.json` refreshed with `pnpm api:sync`, because Vercel builds the UI repo without the API folder.
- Claude Code is launched from `eduujoy/`; it implements one slice from Section 11 per session and runs its checks.

**In scope:** every learner screen, the reviewer and admin screens, session handling, real-time progress, quiz and checkpoint UX, YouTube embeds, performance budgets.

**Out of scope:** the marketing site and SEO landing pages, native apps, and video hosting or playback beyond YouTube's own player.

## 2. Stack and project structure

A Vite + React + TypeScript SPA with feature folders that mirror the API's modules, so a slice in one repo maps to a slice in the other.

| Concern | Choice | Note |
| --- | --- | --- |
| Build | Vite, TypeScript `strict` | Migrating from Next.js 16 (see the migration note below) |
| Routing | React Router (data router: `loader`, `lazy` routes) | Route-level code splitting and auth checks before render |
| Server state | TanStack Query | Fetching, caching, revalidation, request deduplication |
| HTTP | A small fetch client in `src/api/http.ts` with Axios-style interceptors, one instance | Interceptors, typed calls, problem+json mapping |
| API types | `openapi-typescript` generated from the API's `openapi.json` | `pnpm api:types`; CI fails if stale |
| Forms | React Hook Form for quizzes and longer forms; plain controlled forms for sign-in and sign-up | Zod schemas mirror DTO bounds |
| Local UI state | `useReducer` per feature, small React contexts | No global store library in the MVP |
| Styling | Tailwind CSS + CSS variables for tokens | Mobile-first breakpoints |
| Primitives | Radix UI (dialog, popover, tabs, toast) | Accessible behaviour without heavy UI kits |
| Real-time | `EventSource` (native) for SSE; `socket.io-client` loaded lazily after sign-in | — |
| Math | KaTeX, loaded only on steps and quizzes that contain math | STEM topics |
| Tests | Vitest + Testing Library, MSW, Playwright | Reuse the existing Playwright docs pipeline for E2E |

```text
src/
  main.tsx  router.tsx  query-client.ts
  api/          # http.ts (fetch client), client.ts (the one instance), interceptors.ts, errors.ts, schema.d.ts (generated), endpoints/*.ts
  auth/         # session loader, RequireAuth, RequireRole, useSession
  realtime/     # useJobStream (SSE), socket.ts (lazy), useRealtimeEvents
  features/
    onboarding/   diagnostic/   paths/   steps/   checkpoints/   progress/   billing/   admin/
      components/  hooks/  queries.ts  routes.tsx
  ui/           # design-system components, tokens.css, icons
  lib/          # formatters, storage (draft persistence), env
```

**Migration from the existing Next.js app (slice U0a, decided 21 Oct 2026)**

Today `ui/` is Next.js 16.0.10 with React 19.2 (App Router and `pages/api`), Prisma on Neon, Tailwind 4 and npm, with no tests. It becomes a Vite SPA in the same repo: keep the visual design and the screens, delete every piece of server code, because the API now owns it.

| Keep and port into `features/` (proposed mapping) | Delete |
| --- | --- |
| `OnboardingForm` → `onboarding` · `Dashboard` → `/today` · `LearningPath`, `ModuleNode` → `paths` · `ModuleDetail`, `ActionPlanCard` → `steps` · `Profile` → `account` · `BottomNav`, `LoadingScreen` → `ui/` · `VideoPlayerWithSummary` → `YouTubeEmbed` (U8) | `app/api`, `pages/api`, Prisma schema and client, `lib` stores and caches, the n8n flow, `next.config`, and Next-only imports (`next/link`, `next/image`, `next/navigation`, `next/font`) |

- Port components as presentation only: no data fetching moves over; all data arrives through the API module (U1).
- Keep Tailwind 4 and the existing design tokens; map them onto the token roles in Section 4.
- Replace `next/image` with plain `img` (explicit sizes, `loading="lazy"`), `next/font` with self-hosted fonts, and `next/link` with React Router `Link`.
- The security-scan workflow moves from npm to pnpm in U0b.

**Deployment and domains** (full DNS setup: [API PRD, Section 3](https://claude.ai/artifact/2hFY3AbqXzA13eGMJTWhsE))

| Environment | UI host | `VITE_API_URL` | Sign-in works |
| --- | --- | --- | --- |
| Production (`main`) | `https://eduujoy.aindrajaya.my.id` | `https://api.eduujoy.aindrajaya.my.id` | Yes |
| Staging (`develop`, Vercel branch domain) | `https://staging.eduujoy.aindrajaya.my.id` | `https://api.eduujoy.aindrajaya.my.id` | Yes |
| Pull-request previews | `*.vercel.app` | `https://api.eduujoy.aindrajaya.my.id` | No: cross-site cookies; visual review only |
| Local | `http://localhost:5173` | `http://localhost:3000` | Yes |

The Vercel project sets `Content-Security-Policy` with `connect-src` for the API host (HTTPS and WSS) and `frame-src https://www.youtube-nocookie.com`.

## 3. Screens and routes

Eleven routes cover the MVP; every authenticated route is a lazy chunk, and the learner can always reach Today, Paths and Progress in one tap.

&#91;embedded content: route map · 4 onboarding routes, 4 tabs, step and checkpoint loop\]

Passing the top-of-band checkpoint sends the learner back to "Generating path" for the next stage.

| Route | Screen | Main data | Real-time | Stories |
| --- | --- | --- | --- | --- |
| `/signin`, `/signup` | Email and Google sign-in | `POST /v1/auth/*` | — | FR-23 |
| `/start` | Topic, goal, weekly hours, formats | `POST /v1/topics/resolve`, then `POST /v1/diagnostics` (starts the diagnostic and hands off to `/diagnostic/:id`) | — | US-01 |
| `/diagnostic/:id` | Adaptive diagnostic, 4 items per batch | `GET /v1/diagnostics/:id` (resume after reload, contract 0.2.0), `POST /v1/diagnostics/:id/answers` | — | US-02 |
| `/paths/new/:jobId` | Generation progress ("Finding videos… 4 of 6") | SSE `GET /v1/jobs/:id/events` | SSE | US-03 |
| `/today` (home) | Current step, next action, streak | `GET /v1/paths?status=active` (contract 0.1.0; until A9 serves it, pick `status: 'active'` client-side) | WebSocket | US-03 |
| `/paths`, `/paths/:id` | Path list and SOP overview | `GET /v1/paths/:id` | WebSocket | US-03, US-06 |
| `/steps/:id` | Step: actions, resources, embeds, "why this" | `GET /v1/paths/:id` (cached) | — | US-04, US-07, US-08 |
| `/checkpoints/:id` | Checkpoint quiz and result | `POST /v1/checkpoints/:id/submissions` | SSE (open answers) | US-05 |
| `/progress` | Dreyfus × Bloom grid per topic and history | `GET /v1/progress` | WebSocket | US-09 |
| `/account` | Plan, credits, Lemon Squeezy checkout, data export and delete | `GET /v1/auth/me`, `POST /v1/billing/checkout` | WebSocket | FR-23 |
| `/admin/*` | Review queue, cost and latency (reviewer, admin) | `/v1/admin/*` | WebSocket | FR-24, FR-25 |

## 4. Mobile-first UX rules

Design at 360 px wide first, then widen; every primary action sits in the thumb zone and every wait shows real progress, never a bare spinner.

**Layout and navigation**

- Bottom tab bar on mobile (Today, Paths, Progress, Account); left rail from 1024 px.
- One primary action per screen, in a sticky bottom bar (e.g. "Start checkpoint", "Next step").
- Tap targets ≥ 44 × 44 px; 16 px minimum body text; inputs at 16 px so iOS does not zoom.
- Safe-area insets respected (`env(safe-area-inset-bottom)`).

**Feedback and waiting**

- Skeletons that match final layout for every query; no layout shift when data lands.
- Long jobs show staged progress from SSE (stage name, done/total) and can be left; a toast and the WebSocket bring the learner back when ready.
- First request after the API sleeps: after 1.5 s, show "Waking up the server…" instead of a generic loader.
- Optimistic updates for thumbs, difficulty ratings and action checkboxes; roll back on error with a toast.

**Tokens** (CSS variables, light and dark)

| Token group | Values |
| --- | --- |
| Spacing | 4, 8, 12, 16, 24, 32, 48 px |
| Type scale | 12, 14, 16, 18, 20, 24, 30 px; line height 1.5 body, 1.25 headings |
| Radius | 8 px controls, 12 px cards, 999 px chips |
| Colour roles | `bg`, `surface`, `text`, `text-muted`, `primary`, `success`, `warning`, `danger`, plus one colour per Dreyfus stage for the progress grid |
| Motion | 150–200 ms ease-out; all disabled under `prefers-reduced-motion` |

## 4b. Design system: hand-drawn sketch style

The look follows the spirit of Excalidraw: ink lines on paper, slightly wobbly shapes, hand-lettered headings and a few marker colours. The sketch lives in the chrome (cards, buttons, badges, illustrations); content stays plain and readable, because learners spend most of their time reading SOP text and answering questions. Decided 22 Oct 2026; it replaces the existing app's visual tokens while keeping its screens.

**Principles**

- Sketch the frame, not the content: SOP text, quiz options, inputs, numbers and tables use the body font and straight edges.
- Ink and paper first; colour only carries meaning (primary action, status, Dreyfus stage).
- Zero runtime cost for the default style: borders, radii, shadows and hatching are pure CSS; `roughjs` draws only inside lazy chunks.
- Dark mode swaps paper and ink and keeps every shape.
- A reference, not a copy: no Excalidraw name, logo or brand colour anywhere in Eduujoy.

**Typography**

| Role | Font | Rules |
| --- | --- | --- |
| Display: H1–H3, logo wordmark, empty-state captions, annotations | Excalifont (OFL-1.1), self-hosted Latin subset | Never below 18 px; never for body, inputs, quiz options or numbers |
| Body, UI, badges, inputs, quiz options | Nunito variable (OFL-1.1), self-hosted Latin subset | 16 px minimum; SOP prose at line height 1.6 and max width 68ch |
| Code and typed math answers | System monospace stack | No web font in the MVP |

**Colour tokens** (starting values; ratios measured against `bg`)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` (paper) | `#FDFBF7` | `#121212` | Page background |
| `surface` | `#FFFFFF` | `#1E1E1E` | Cards, sheets, dialogs |
| `text` (ink) | `#1E1E1E` (16.1:1) | `#E9ECEF` (15.8:1) | Text, borders, shadows |
| `text-muted` | `#5C5F66` (6.2:1) | `#ADB5BD` (9.0:1) | Secondary text |
| `primary` | `#1971C2` (4.9:1) | `#74C0FC` (9.5:1) | Primary action, links, focus ring |
| `success` | `#237A36` (5.2:1) | `#69DB7C` (10.7:1) | Passed, done |
| `warning` | `#B35900` (4.7:1) | `#FFA94D` (9.8:1) | Needs attention |
| `danger` | `#C92A2A` (5.3:1) | `#FF8787` (8.1:1) | Errors only |

Button label on `primary`: white on `#1971C2` is 5.0:1; in dark mode, `#121212` on `#74C0FC` is 9.5:1.

**Dreyfus stage colours** (strokes, fills and hatching only; the stage name is always written in ink beside the colour)

| Stage | Light | Dark |
| --- | --- | --- |
| Novice | `#0C8599` (4.2:1) | `#3BC9DB` |
| Advanced beginner | `#5C940D` (3.6:1) | `#A9E34B` |
| Competent | `#D9480F` (4.2:1) | `#FF922B` |
| Proficient | `#C2255C` (5.5:1) | `#F783AC` |
| Expert | `#6741D9` (6.1:1) | `#9775FA` |

Every stage colour meets the 3:1 non-text minimum (WCAG 1.4.11); the dark values range from 5.6:1 to 12.3:1 on `#121212`. None is used as text colour.

**Shapes and depth**

| Element | Spec |
| --- | --- |
| Stroke | 2 px ink; round caps on SVG lines |
| Wobbly radius | Asymmetric elliptical `border-radius`, e.g. `255px 15px 225px 15px / 15px 225px 15px 255px` for cards; a tighter set for buttons and inputs; chips stay pill-shaped |
| Shadow | Hard offset, no blur: `3px 3px 0 var(--text)`; the pressed state moves 2 px and drops the shadow |
| Completed or selected | Diagonal hatching (`repeating-linear-gradient`) plus a check mark, so state never depends on colour alone |
| Focus ring | 3 px dashed `primary`, 3 px offset, on every interactive element |
| Icons | Stroke icons at 2 px to match the borders (e.g. Lucide) |

**Where rough.js is allowed**

- `roughjs` 4.6.x is about 9 KB gzip (measured on its ESM bundle). It loads only in lazy chunks: the progress grid and empty-state or onboarding illustrations.
- Every rough shape gets a fixed `seed`, so it draws the same on every render and in screenshot tests.
- Never for text, inputs, buttons or rows in a scrolling list. No SVG displacement filters (`feTurbulence`) on scrolling content: they are costly to paint on mid-range Android.

**Components** (built in slice U12a, shown on a dev-only `/dev/ui` gallery; slice UD first builds only the ones /demo needs)

`Button` (primary, secondary, ghost) · `Card` · `ResourceCard` (source label, duration, Bloom chip, "why this") · `StageBadge` · `BloomChip` (C1–C6 with its verb, e.g. "C3 Apply") · `StickyActionBar` · `BottomTabBar` and `SideRail` · `Skeleton` (same wobbly outlines; pulse off under reduced motion) · `Toast` · `EmptyState` (sketch illustration plus one action) · `QuizOption` · `YouTubeFacade` frame · `ProgressGrid`

**Learning UX rules**

- Diagnostic: low-stakes framing ("This sets your starting point; it is not a test"), set progress ("Set 2 of about 4"), and an "I don't know yet" option on every item so learners do not guess.
- Steps show their Bloom chip and an estimated time; Today shows how the current step fits the learner's weekly hours.
- A failed checkpoint reads as the next move: first what was solid, then the remedial step as the primary action. No full-screen red state.
- SOP reading view: 68ch max width, line height 1.6, numbered actions with checkboxes, code and math blocks full width with horizontal scroll.
- Every screen has four designed states: loading (skeleton), empty, error and success. Today also has a designed first-visit state.
- Motion stays at 150–200 ms; sketch shapes never wiggle or redraw as decoration.

**Screen designs** (Claude Design; 360 px first, then 1024 px)

| Screen | States to design | Design |
| --- | --- | --- |
| `/steps/:id` | SOP view, video facade, resources, "why this", video unavailable | Pending |
| `/today` | First visit, mid-path, streak | Pending |
| `/diagnostic/:id` | Question, "I don't know yet", set progress | Pending |
| `/paths/new/:jobId` | Staged progress, server waking up, failure | Pending |
| `/checkpoints/:id` result | Pass, fail to remedial step, grading in progress | Pending |
| `/progress` | Dreyfus × Bloom grid, empty, several topics | Pending |

Source of truth: the [Eduujoy Sketch design system](https://claude.ai/artifact/MKjvYYMSnrR6e5AtxMWzrk) (tokens, fonts, 14 components with live previews, namespace `window.Eduujoy`). Claude Code pulls it with `/design-sync` run from `eduujoy/ui/`; slice U12a ports its tokens and primitives into `src/ui`.

## 5. Data layer

Components never call the HTTP client: they call typed functions in `src/api/endpoints`, wrapped by TanStack Query hooks in each feature's `queries.ts`. Real-time events update the same query cache, so every screen reads from one source.

**Central API module rules**

1. One HTTP client instance (`src/api/http.ts`, Axios-style interceptors): `baseURL = VITE_API_URL`, `withCredentials: true`, timeout 15 s (60 s for uploads); absolute URLs outside that origin are refused.
2. Request interceptor adds `X-Request-Id` (UUID) and `X-Requested-With: eduujoy`; unsafe methods that create work also send `Idempotency-Key`.
3. Response interceptor maps `application/problem+json` to a typed `ApiError { status, code, title, detail, fieldErrors, requestId }`.
4. On `401`, run one shared refresh (`POST /v1/auth/refresh`): concurrent `401`s wait for the same promise, then each original request retries once. If refresh fails, clear the query cache and route to `/signin?next=…`.
5. Never retry `4xx` except `408` and `429` (honour `Retry-After`).

```ts
// src/api/client.ts (shape, not final code)
let refreshing: Promise<void> | null = null;
api.interceptors.response.use(undefined, async (error) => {
  const original = error.config;
  if (error.response?.status !== 401 || original._retried || NO_REFRESH.some((p) => original.url?.endsWith(p))) throw toApiError(error); // login, register, logout, refresh only
  original._retried = true;
  refreshing ??= api.post('/v1/auth/refresh').then(() => undefined).finally(() => { refreshing = null; });
  await refreshing;           // throws → session expired handler
  return api(original);
});
```

**TanStack Query conventions**

| Setting | Default | Overrides |
| --- | --- | --- |
| `staleTime` | 30 s | `auth/me` 5 min; topic lists 10 min; job status 0 (driven by SSE) |
| `gcTime` | 5 min | Path detail 30 min (step pages reuse it) |
| `retry` | 2 for network and `5xx`, 0 for `4xx` | Mutations: 0 |
| `refetchOnWindowFocus` | true for paths, progress | false for quizzes |
| Query keys | Factory per feature: `pathKeys.detail(id)`, `progressKeys.topic(id)` | — |

- Deduplication comes from shared keys: the Today screen and the step screen both read `pathKeys.detail(id)`, so one request serves both.
- Mutations invalidate by key prefix (`pathKeys.all`) or update with `setQueryData` when the response returns the new entity.
- Prefetch on intent: hovering or focusing a step link calls `queryClient.prefetchQuery` and the route's `lazy()` import.

**Real-time hooks**

- `useJobStream(jobId)`: opens `EventSource` with credentials, writes each event into `jobKeys.detail(jobId)`, and on `completed` seeds `pathKeys.detail` and navigates.
- `useRealtimeEvents()`: mounted once in the app shell; lazily imports `socket.io-client` after sign-in; maps `path.ready`, `checkpoint.graded`, `entitlement.changed` to cache updates and toasts; disconnects after 5 min with the tab hidden.

## 6. Auth and session

The browser never sees a token: the API sets HttpOnly cookies, and the UI learns who is signed in only from `GET /v1/auth/me`. Protected screens do not render until that answer is known.

**Boot sequence (no flash of unauthenticated content)**

1. `index.html` ships a static splash (logo + skeleton) inside `#root`, so first paint never shows protected UI or a login form by mistake.
2. The root route `loader` calls `queryClient.query(sessionQuery)` (`ensureQueryData` is deprecated in TanStack Query 5.104), which hits `/v1/auth/me` once and caches it for 5 min.
3. Protected routes (`RequireAuth`) read that cached result inside their `loader`: signed out → `redirect('/signin?next=…')` before any component renders.
4. `RequireRole('reviewer' | 'admin')` does the same for admin routes; the API enforces roles regardless.
5. Public-only routes (`/signin`, `/signup`) redirect signed-in users to `/today`.

**Rules**

- No tokens, roles or plan data in `localStorage` or `sessionStorage`; they live only in the query cache.
- Google sign-in is a full-page redirect to `GET /v1/auth/google`; the API redirects back to `/today` or `next`.
- Sign-out calls `POST /v1/auth/logout`, then `queryClient.clear()`, closes the socket, and replaces the history entry.
- Session expiry anywhere (refresh fails) shows a one-line notice on the sign-in page and keeps unsent quiz drafts in storage.
- Hosts: the UI runs at `https://eduujoy.aindrajaya.my.id` and calls `VITE_API_URL=https://api.eduujoy.aindrajaya.my.id`. Both sit under `aindrajaya.my.id`, so the API's cookies are same-site (API PRD Section 6).

## 7. Forms and quiz engine

Typing never re-renders anything but the input itself: answers live in uncontrolled React Hook Form fields, quiz navigation lives in a reducer scoped to one quiz, and nothing reaches the server until the learner submits the whole batch.

**Forms (onboarding, account, admin)**

- React Hook Form with `mode: 'onSubmit'`, then `reValidateMode: 'onChange'`; Zod schemas mirror the API DTO bounds.
- Server field errors (`ApiError.fieldErrors`) are mapped back with `setError`.
- No component reads `watch()` on the whole form; use `useWatch` on a single field when a preview is needed.

**Quiz engine (diagnostic and checkpoints)**

Each quiz instance owns its state through `useReducer` inside a `QuizProvider`; two contexts (state and dispatch) keep buttons that only dispatch from re-rendering.

```ts
type QuizState = {
  quizId: string;
  index: number;                       // current question
  answers: Record<string, Answer>;     // committed answers
  flagged: Set<string>;
  status: 'answering' | 'reviewing' | 'submitting' | 'submitted' | 'error';
  idempotencyKey: string;              // created once per attempt
};
type QuizAction =
  | { type: 'COMMIT'; questionId: string; answer: Answer }
  | { type: 'GO_TO'; index: number }
  | { type: 'TOGGLE_FLAG'; questionId: string }
  | { type: 'SUBMIT' } | { type: 'SUBMITTED' } | { type: 'FAILED'; error: ApiError }
  | { type: 'RESTORE'; snapshot: Partial<QuizState> };
```

- One question renders at a time; each question is a memoised component with its own RHF field. `COMMIT` fires on "Next", not on every keystroke.
- The review screen lists all questions with `@tanstack/react-virtual`, so 50 long questions scroll smoothly on a mid-range phone.
- Drafts persist to `localStorage` under `quiz:{userId}:{quizId}`, debounced 1 s, and `RESTORE` on reload; cleared after a confirmed submit or sign-out by another user.
- Math (STEM) answers use a textarea with a lazily loaded KaTeX preview; code answers use a plain monospace textarea (no editor bundle in the MVP).

**Batch submission**

| Quiz | Batch size | Endpoint | Retry behaviour |
| --- | --- | --- | --- |
| Diagnostic | 4 items per request (adaptive) | `POST /v1/diagnostics/:id/answers` | Same `Idempotency-Key` per batch; up to 3 retries |
| Checkpoint | All answers in one request | `POST /v1/checkpoints/:id/submissions` | Same key per attempt; offline → queued until `online` event |

- Auto-graded results come back in the response; open answers return a `jobId`, and the result screen streams the grade over SSE.
- The submit button is disabled while `submitting`; a second tap cannot create a second attempt because the key is reused.

## 7b. Public demo: Dreyfus × Bloom diagnostic

/demo lets anyone take a 5-minute diagnostic without signing up and see where they sit on the Dreyfus × Bloom grid. It runs entirely in the browser on the real quiz engine, so it is both the product's first public screen and a portfolio piece (FR-26, slice UD).

**Scope**

- Public route outside RequireAuth: no API calls, no cookies, no third-party scripts, no model cost.
- One topic: "Learning science for exam prep" (retrieval practice, spacing, interleaving, metacognition). It is non-clinical, evidence-based and relevant to any exam candidate. The item format is topic-agnostic, so a second topic is one more JSON file.
- Reuses the existing quiz engine from Section 7 (built in U5, U6 and U9: QuizProvider, reducer, drafts, idempotency key) behind `DiagnosticPort`, and the Section 4b primitives. Demo-only code is limited to the item bank, the adaptive selector, placement and the result screen.
- A `DiagnosticPort` interface with two adapters: `LocalDiagnosticAdapter` (demo; in-browser, same idempotency semantics, 300–600 ms simulated latency) and `ApiDiagnosticAdapter` (U6; `POST /v1/diagnostics/:id/answers`). Switching adapters changes no screen.

**Item bank** (`src/features/demo/data/learning-science.json`)

- 18 items, 3 per Bloom level. Each has `id`, `bloom`, `type`, `prompt`, `options`, `answer`, a one-line `explanation` and a `source`.
- Every item offers "I don't know yet". It scores as not correct, and the copy never calls it wrong (Section 4b learning rules).
- Items are hand-reviewed before shipping, following the master PRD's golden-set rule.

| Bloom | Item type | Example |
| --- | --- | --- |
| C1 Remember | Single choice | Which definition matches retrieval practice? |
| C2 Understand | Single choice | Why does spaced study beat one long session? |
| C3 Apply | Scenario, single choice | Mock exam in 6 days, 2 hours a day: what do you do today? |
| C4 Analyse | Case, single choice | A learner's log shows high scores on day 1 and low on day 7: what causes it? |
| C5 Evaluate | Two linked single-choice questions | Pick the better of two study plans, then the reason; both must be right |
| C6 Create | Order blocks | Arrange 8 study blocks into a 7-day plan; graded by rules: spacing gaps, interleaved topics, a retrieval session before the mock |

**Adaptive flow** (8–12 items, 4 per batch, median ≤ 5 min, as US-02 requires)

1. Self-report (not scored): years studying this way (none, under 1, 1–3, 3+) and whether they have ever planned someone else's study.
2. Batch 1: one item each at C1, C2, C3 and C4.
3. Batch 2: let b be the highest level passed in batch 1 (0 if none). Ask items at b, b+1, b+1 and b+2, clamped to C1–C6, never repeating an item.
4. Batch 3, only when confidence is low after batch 2: up to 4 items at the unsettled levels. The total never exceeds 12.

**Placement** (pure function `place(answers, selfReport)`, table-tested in Vitest)

- Verified Bloom is the highest level L whose accuracy is at least 2/3 (or 1/1 when one item was asked), with every lower level that was asked at least 1/2. When nothing is verified, the result reads "Start at C1".
- The stage comes from the master PRD Section 5 bands: L maps to the lowest stage whose band contains it, and the self-report promotes it by at most one stage.

| Verified Bloom | Base stage | Promoted to | Promotion rule |
| --- | --- | --- | --- |
| C1 | Novice | — | — |
| C2 | Novice | Advanced Beginner | 1+ years |
| C3 | Advanced Beginner | Competent | 1+ years |
| C4 | Competent | Proficient | 3+ years |
| C5 | Proficient | Expert | 3+ years and has planned others' study |
| C6 | Expert | — | — |

- Confidence is high when the boundary level had 2 or more items and no level was passed above a failed one. It is medium with one such inversion, and low otherwise; low triggers batch 3.
- The reason line names the evidence: "You got 3 of 3 Apply items and 1 of 3 Analyse items."

**Result screen**

- ProgressGrid with the visitor's cell hatched and labelled; the stage name is written in text beside its colour.
- A per-level breakdown (asked and correct for C1–C6). Each item expands to its explanation and source.
- "Your next step": the first 3 steps a path at the next stage would contain (static, from the JSON), each with its Bloom chip.
- "Under the hood" (collapsed): a short architecture summary of the reducer, draft restore, idempotent submit and the adapter seam. No repository link: both repos are private (user decision, 22 Oct 2026).
- One primary action, Retake, which starts a new attempt with a new idempotency key.

**Done when**

- A full run takes 8–12 items. A reload mid-quiz returns to the same question with its answers. A double tap on submit yields one result. A keyboard-only run passes and axe reports no violations.
- The /demo route chunk is at most 60 KB gzip, with roughjs and the grid in their own lazy chunk. LCP is at most 2.5 s on /demo (Lighthouse mobile).

## 8. Video: embed, don't build a player

Eduujoy owns no video, so the MVP builds no player abstraction, no content security and no watch-time tracking. It ships one lightweight YouTube embed component; the checkpoint, not minutes watched, is the progress signal.

| Concern | Decision | Why |
| --- | --- | --- |
| Player abstraction | None. One `YouTubeEmbed` component | One source (YouTube); an abstraction pays off only with a second provider or own content |
| Performance | Facade: show the unaltered thumbnail and title; load the `youtube-nocookie.com` iframe only on tap | The iframe is the heaviest thing on a step page; deferring it protects mobile LCP |
| Segment focus | Pass `start` and `end` from the SOP's timestamp range; show "Watch 04:10–07:45" above the player | The SOP points to the part that matters |
| Security | CSP `frame-src https://www.youtube-nocookie.com`; iframe `allow` limited to `encrypted-media; picture-in-picture; fullscreen`; no DRM | Content is public and hosted by YouTube |
| Progress | Learner ticks "Done with this segment" (optimistic `PATCH /v1/steps/:id`) | Watching is not learning; checkpoints measure learning |
| Unavailable video | On iframe error or the API's `ResourceDead` event, show "Video unavailable" with a one-tap swap | Keeps the step usable |

**YouTube rules the component must respect**: keep the thumbnail and title unaltered, make a tap on the thumbnail start playback, and do not cover or hide the player's own controls ([YouTube developer policies guide](https://developers.google.com/youtube/terms/developer-policies-guide)).

**Revisit later (P1):** use the YouTube IFrame Player API to tick a segment automatically when playback reaches `end`. Build real player abstraction and tracking only if Eduujoy ever hosts its own videos.

## 9. Performance budget

The app shell must be interactive on a mid-range Android over 4G within the master PRD's targets (LCP ≤ 2.5 s, INP ≤ 200 ms); CI fails a build that breaks the budget.

| Budget | Limit | Checked by |
| --- | --- | --- |
| Initial JS (shell + first screen: `/signin` signed out, `/today` signed in), gzip | ≤ 150 KB, per screen | `size-limit` in CI |
| Any single route chunk, gzip | ≤ 60 KB | `size-limit` |
| LCP (mobile, simulated 4G) | ≤ 2.5 s | Lighthouse CI on `/signin`, `/today`, `/steps/:id` |
| INP | ≤ 200 ms | Lighthouse CI + `web-vitals` RUM to the API |
| CLS | ≤ 0.1 | Lighthouse CI |
| Third-party scripts at load | 0 | Code review; YouTube loads on tap only |

Lighthouse CI runs on a `--mode mock` build that ships the MSW worker, so authenticated screens can be audited without an API; production builds never contain MSW.

**Code splitting and lazy loading**

- Every route uses React Router `lazy()`; the shell holds only layout, auth and the query client.
- Dynamically imported on demand: `socket.io-client` (after sign-in), KaTeX (math content), `@tanstack/react-virtual` (review screen), progress-grid charts, admin screens, Markdown renderer for SOP text.
- Prefetch the next likely chunk on intent (link hover or focus) and after idle (`requestIdleCallback`) for `/steps/:id` from `/today`.
- Self-hosted variable font subset with `font-display: swap`; system font fallback metrics tuned to avoid shift.
- Images: thumbnails from YouTube use `loading="lazy"`, explicit width and height, and `srcset` for the smaller thumbnail sizes.

**Rendering**

- Memoise list rows and quiz questions; keep context values stable; no state in the app shell that changes per keystroke.
- Use `useDeferredValue` for client-side filtering of long lists (paths, admin queue).
- Avoid layout thrash in the progress grid by drawing it as a single SVG.

## 10. Accessibility, testing and quality gates

WCAG 2.2 AA is a merge gate, and every user story in the master PRD has at least one Playwright test.

**Accessibility**

- Keyboard-complete quiz: arrow keys between options, Enter to commit, visible focus rings.
- Live regions announce SSE progress ("Analysing videos, 4 of 6") and grading results.
- Colour is never the only signal on the progress grid; each cell has a text label.
- `axe` checks in component tests and in Playwright runs.

**Testing**

| Level | Tool | Gate |
| --- | --- | --- |
| Unit (reducers, mappers, hooks) | Vitest | Quiz reducer and API error mapper at 100% branch coverage |
| Component | Testing Library + MSW handlers generated from `openapi.json` | Every screen renders loading, empty, error and success states |
| E2E | Playwright against a seeded staging API | US-01 to US-09 happy paths; refresh-token expiry; offline quiz submit |
| Visual and docs | Existing Playwright docs pipeline | Screenshots feed the user manual |
| Performance | Lighthouse CI, `size-limit` | Section 9 budgets |

**CI order:** `pnpm api:types --check` → `lint` → `typecheck` → `test` → `build` → `size-limit` → Playwright (staging) → Lighthouse CI.

## 11. Build plan for Claude Code

Fourteen slices, worked one at a time. Each slice builds against MSW mocks generated from `openapi.json`, so UI work never waits for the matching API slice; the "Pairs with" column says when to switch a slice to the real API.

| ID | Slice | Pairs with | Done when | Verify |
| --- | --- | --- | --- | --- |
| U0a | Vite migration: new Vite + React Router shell in the same repo; port the kept screens as presentation-only components (Section 2 migration note); delete Next.js server code, Prisma and `next.config` | — | App runs on Vite with the kept screens rendering from static props; no `next` dependency left; no server code in the repo | `pnpm build && pnpm preview`; `grep -r "from 'next" src` returns nothing |
| U0b | Tooling: strict TS, ESLint, Vitest, Tailwind tokens, `size-limit`, Lighthouse CI, CI pipeline (security scan moved to pnpm) | A0 | CI green on `main`; budgets reported | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` |
| U1 | API module: HTTP client (fetch, Axios-style interceptors), interceptors, `ApiError`, generated types, MSW setup | A3 | Refresh single-flight test passes with 5 parallel 401s | `vitest api/` |
| U2 | Router and auth: data router, lazy routes, session loader, `RequireAuth`, `RequireRole`, sign-in and sign-up | A2 | No protected markup in the DOM before `auth/me` resolves | Playwright `auth.spec.ts` |
| U3 | App shell: bottom tabs, sticky action bar, skeletons, toasts, wake-up state | — | Lighthouse mobile LCP ≤ 2.5 s on `/today` (mocked) | Lighthouse CI |
| U4 | Onboarding: topic intake with disambiguation | A6 | US-01 acceptance criteria pass | Playwright `onboarding.spec.ts` |
| U5 | Quiz engine: reducer, providers, drafts, batch submit, virtual review | — | Typing in a 50-question quiz keeps INP ≤ 200 ms | Vitest reducer tests; Playwright perf trace |
| U6 | Diagnostic flow on the quiz engine | A7 | US-02 acceptance criteria pass | Playwright `diagnostic.spec.ts` |
| U7 | Generation progress: `useJobStream`, staged progress, resume on reload | A9 | Reload mid-job resumes from `Last-Event-ID` | Playwright with mocked SSE |
| U8 | Paths and steps: SOP view, resources, `YouTubeEmbed` facade, swap, thumbs, difficulty | A9, A11 | US-03, US-04, US-07, US-08 pass; no iframe before tap | Playwright `steps.spec.ts` |
| U9 | Checkpoints: submission, results, remedial step UX, SSE grading | A10 | US-05 passes, including offline submit | Playwright `checkpoint.spec.ts` |
| U10 | Progress grid, realtime socket, account and Lemon Squeezy checkout | A11, A12 | US-09 passes; second tab updates live | Playwright `progress.spec.ts` |
| U11 | Admin: review queue and cost dashboard (lazy chunk) | A13 | Reviewer can resolve an item; learners cannot load the chunk | Playwright `admin.spec.ts` |
| UD | Public demo (Section 7b): reuses the U5/U6 quiz engine behind DiagnosticPort with a LocalDiagnosticAdapter; first ships U12a's token and font foundation on /demo; item bank, adaptive selector, placement, result screen | — (no API) | A visitor finishes /demo in 8–12 items and lands on the grid; reload restores the attempt; a double tap on submit yields one result; keyboard-only run passes | vitest src/features/demo (selector and placement tables); Playwright demo.spec.ts with axe; size-limit; Lighthouse CI on /demo |

**Starter `CLAUDE.md` for the UI repo**

```markdown
# Eduujoy UI (React)
Specs: ../docs/PRD-MASTER.md (product, wins on conflict) and docs/PRD-UI.md (implementation).
API shapes come only from docs/openapi.json; refresh it with `pnpm api:sync` (copies ../api/openapi.json, regenerates types).
- Implement exactly one slice from PRD-UI Section 11 per session; branch slice/U<n>-<name>; commit prefix `ui:`.
- Run git, pnpm and tests from inside ui/ (separate repo).
- Components call feature hooks in queries.ts, never call fetch directly; always use src/api.
- No tokens or session data in localStorage; auth state comes from /v1/auth/me only.
- Keep every route lazy; run size-limit before finishing.
- Run the slice's Verify commands; if the PRD is ambiguous, stop and list the question.
```

## 12. Open questions

- [x] Build tool: the codebase is Next.js 16; it migrates to a Vite SPA in U0a (decided 21 Oct 2026).
- [x] What to keep and what to replace: see the migration note in Section 2.
- [x] Brand style: hand-drawn sketch style in the spirit of Excalidraw, restyling the existing screens (decided 22 Oct 2026); see Section 4b.

## Sources

- [YouTube API Services — Developer policies guide](https://developers.google.com/youtube/terms/developer-policies-guide)
