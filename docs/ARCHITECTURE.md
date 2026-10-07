# Architecture

## Request and evidence flow

`app/page.js`, `app/ux-audit/page.js`, and `app/feedback/page.js` expose the workspaces. The client submits Page, Site, Compare, or UX requests to `app/api/analyze/route.js`. The route validates inputs and public destinations and returns JSON, or newline-delimited JSON progress followed by the result.

`lib/fetchSiteSignals.js` combines Jina Reader Markdown, directly fetched HTML, robots/sitemap signals, sampled pages, and passive security observations. `lib/crawlDiagnostics.mjs` distinguishes an actual failed page from a fetch provider that failed before another provider recovered the page.

`lib/urlGuard.js` rejects non-public destinations, checks DNS again at connection time for Node HTTP/HTTPS requests, rechecks redirects, and bounds encoded and decoded responses. These checks do not control the network used by a separately deployed browser service. That service needs its own egress boundary.

Google CrUX and PageSpeed integrations add field and lab measurements when available. Browserless can provide screenshot evidence for UX audits. `lib/consentCapture.mjs` admits screenshots for analysis only when a supported privacy-preserving consent outcome is verified. Missing evidence must remain missing; it must not become a measured pass or invented visual observation.

`lib/analyzeSeoContent.js` performs optional server-side OpenAI analysis. Mode-specific schema modules normalize the output; heuristic reports remain available when AI is absent or fails. Passive security results and their explanations are deterministic, not generated pass/fail judgments.

## Presentation and state

`components/PageSignalApp.js` coordinates the main workflow. Shared primitives, report sections, progress handling, tickets, and exports live under `components/optiscan/`. UX has its own workspace and report component. `lib/personas.mjs` defines the current three personas for UX and feedback classification.

The current audit is client state. Ticket completion and feedback records persist in local storage on the same browser. Successfully emailed feedback is also added to the local library. Manual/CSV feedback stays local; submitting the feedback form transmits its message and context to the configured delivery service. There is no server database, account system, shared inbox, or scheduled job runner.

## External data recipients

| Recipient | Data sent | Condition |
| --- | --- | --- |
| Target website | HTTP requests for pages and site metadata | Any real audit |
| Jina Reader | Target URL | Readable-content fetch |
| Google APIs | Target URL | Relevant API key configured |
| OpenAI | Extracted evidence and, where admitted, screenshot data | AI key configured |
| Browserless | Target URL and server-owned browser code | Screenshot service configured |
| Feedback endpoint | Message, sender email and selected page/report context | All feedback settings configured and user submits |
| Google Analytics | Page view and sanitized product events | Valid build-time measurement ID configured |

Use public or permitted targets. Do not place private audit data in public bug reports. Operators own provider contracts, retention settings, deployment access, and any consent arrangements.

## Boundaries and deliberate tradeoffs

- HTML extraction is lightweight and does not recreate every client-rendered application state.
- Site sampling is bounded to 100 pages per request and is not an exhaustive crawl. It does not impose a shared per-user cost quota.
- Heuristics trade nuance for predictable behavior without paid dependencies.
- A screenshot shows one state and viewport; persona findings remain hypotheses to validate with people and measured experiments.
- Scores describe the observed evidence model. They do not demonstrate search-ranking gains, revenue, accessibility conformance, or penetration-test coverage.
- Browser-local feedback avoids a backend dependency but does not provide team collaboration or durability across devices.

See [SECURITY.md](../SECURITY.md) for the live-deployment requirements and [CASE_STUDY.md](CASE_STUDY.md) for the implementation narrative.

## Public interface

`components/design/Providers.js` provides Motion's reduced-motion preference. `AppShell.js` owns desktop navigation, the mobile dialog and shared page headings. `primitives.js` composes shadcn/Radix inputs, buttons, dialogs, alerts and tabs while preserving application callback contracts. `components/ui/` contains the installed Magic UI and shadcn source components. `app/globals.css` defines cool light tokens and layout. Material UI, Emotion, Mantine and Lucide are not dependencies; local Material SVGs preserve the requested icon system. System fonts require no external font fetch. See `THIRD_PARTY_NOTICES.md` for licenses and adaptations.

Historical `optiscan` module folders, stream headers and storage keys remain as compatibility identifiers; user-facing identity is PageSignal. The previous appearance and mockups are excluded from the public source.

## Private persona persistence

`SavedPersonaLibrary` manages email sign-in and persona editing in the UX workspace. Browser requests stay on the application origin. `lib/persona/server.js` creates a cookie-based Supabase client in route handlers, verifies the user and queries with their JWT. `app/api/personas/route.js` provides CRUD; Supabase Postgres separately enforces owner-only RLS, column permissions, field limits and a 50-row per-owner quota. Auth routes use a fixed PKCE callback and HttpOnly cookies. No global proxy is needed because no protected Server Component reads/refreshes sessions.

`lib/customPersonas.mjs` validates row content and resolves selected IDs against examples plus explicitly loaded owned rows. The analyze route resolves private IDs before target fetching or starting the stream; report metadata retains a persona snapshot without account identifiers. Feedback classification continues to use the fixed example library.
