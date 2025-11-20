CONTEXT:
- I have an existing single-file React UI at `raw-ui.js` (attached). Use it as the design and UX source of truth (layout, Tailwind-like classes, icons). :contentReference[oaicite:1]{index=1}
- App is Next.js using the pages router. Target: production-grade implementation to track a single user's learning progress with AI features.
- I have a Gemini API key (server-side only). I want a YouTube player that can fetch captions, call Gemini to summarize the transcript, and show the summary inside the UI.

GOAL:
Produce complete, copy-paste-ready code for a Next.js project that:
1. Breaks `raw-ui.js` into modular components under `components/` and implements `pages/index.js` preserving original screens and transitions (Onboarding -> Loading -> Dashboard -> Module detail). Keep naming and classnames consistently with the original file.
2. Adds a fully functioning YouTube summarization flow using the Gemini API without exposing the API key to the browser.
3. Ship safe server endpoints, caching, and defensive parsing for model output.

DETAILED REQUIREMENTS / SPEC:
A. Components to generate
- `components/VideoPlayerWithSummary.jsx`:
  - Props: `{ videoId, title }`
  - Renders a responsive YouTube iframe and controls.
  - "Generate Summary" button:
    1. Calls `GET /api/transcript?videoId=...` to fetch transcript.
    2. Calls `POST /api/summarize` with `{ transcript, title, videoUrl }`.
    3. Shows loading spinners, errors, and the returned JSON summary (render summary paragraph, bullets for takeaways and actions).
  - Limit transcript to a safe chunk size (e.g., first 120k characters) and warn in UI if truncated.
  - Use axios.

B. Server API endpoints
- `pages/api/transcript.js`:
  - Uses `youtube-transcript` npm package (`getTranscript(videoId)`) to fetch captions.
  - Merge segments into a single string with optional timestamps.
  - Return `{ transcript, rawSegments }`. On failure return `{ transcript: '', error }` with proper status codes.
- `pages/api/summarize.js`:
  - POST endpoint. Require JSON body `{ transcript, title, videoUrl }`.
  - Read `GEMINI_API_KEY` and `GEMINI_MODEL` from process.env (fail early with helpful error if missing).
  - Trim transcript to model-friendly length (configurable via env `MAX_TRANSCRIPT_CHARS`).
  - Build an explicit system+user prompt instructing Gemini to return strictly valid JSON:
    ```
    System: You are an assistant that receives a video transcript and returns JSON with keys: summary (3-4 sentences), takeaways (5 bullets), actions (2-3 suggested action items). Respond with a single valid JSON object and nothing else.
    User: {title, videoUrl, transcript}
    ```
  - Call Google's Generative Language REST endpoint (model `${GEMINI_MODEL}`) and pass API key server-side (use `?key=...` or `x-goog-api-key` as appropriate). Use temperature 0.2 and max tokens limit.
  - Parse response defensively: check `output`, `candidates`, `text`, etc., then search for a JSON block and parse. If parsing fails, return `{ summary: generatedText }`.
  - Use server-side in-memory cache (simple Map with TTL) to avoid repeated summarization of same transcript; store by `videoId` or transcript hash. Make TTL configurable (e.g., 24h).
  - Return `{ summary, takeaways, actions, rawModelOutput? }`.

C. Integration with `raw-ui.js`
- Provide a small patch/snippet to replace resource anchor in `ModuleDetailScreen` for YouTube type resources with:
    ```
    import VideoPlayerWithSummary from '@/components/VideoPlayerWithSummary'
    ...
    {resource.type === 'YouTube' ? (
    <VideoPlayerWithSummary videoId={extractVideoId(resource.link)} title={resource.name} />
    ) : ( ... existing link rendering ... )}
```
- Provide `extractVideoId(url)` helper that handles `youtu.be/` and `watch?v=` forms.

D. Production & Security Notes (to include as code comments and README snippet)
- Put `GEMINI_API_KEY` and `GEMINI_MODEL` in `.env.local`. Do not commit keys.
- Add rate-limiting advice and a basic in-memory limiter stub (requests per IP per minute) for `/api/summarize`.
- Recommend Redis/Metastore for caching in real production and a job queue for long-running transcripts.
- Add error handling for quota/429 and surface readable errors to the client.
- Add small unit-test suggestions for API endpoints (e.g., test transcript endpoint with known public YouTube video id and mock Gemini responses).

E. Developer / Install notes to show at top of generated code
- `npm install axios youtube-transcript node-fetch` (or `yarn add ...`)
- Add `.env.local`:
    ```
    GEMINI_API_KEY=ya29....your_key
    GEMINI_MODEL=gemini-2.5-flash
    MAX_TRANSCRIPT_CHARS=120000
    SUMMARY_CACHE_TTL_SEC=86400
    ```
- Restart Next dev server.

F. Output expectation from Copilot
- Provide complete file contents for:
- `components/VideoPlayerWithSummary.jsx`
- `pages/api/transcript.js`
- `pages/api/summarize.js`
- snippet to modify `pages/index.js` or relevant ModuleDetailScreen render to use the new component
- Keep styling consistent with `raw-ui.js`: use the same Tailwind-like classes and lucide-react icons.
- Include JSDoc or brief comments on important functions and TODOs for future improvements.

EXTRA: Add a short test checklist the generated code should include (unit tests or manual tests):
1. Open app and navigate to Module -> YouTube resource. Video iframe loads and plays.
2. Click "Generate Summary" -> transcript fetch -> Gemini summary returned and rendered.
3. If transcript unavailable, show clear message and fallback "Open YouTube" link.
4. Repeated requests for same video should return cached summary quickly.

Run Copilot and generate the files now.
