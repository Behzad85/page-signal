# PageSignal: recreation master prompt

Build PageSignal, a working website-analysis and UX-review application that turns observed evidence into prioritized implementation work. This document and `design-source.json` describe the current public edition. Do not reconstruct the earlier dashboard appearance from private history.

## Origin and design source

USER_PROVIDED, 6 October 2026: the owner built the application independently from scratch as a side project, without an employer instruction, and confirmed permission to publish the code. The public edition excludes former company personas, portraits, internal links and old mockups. Treat this as the owner's attributed statement; do not invent ownership proof, sole-authorship claims, adoption, recognition, or visa outcomes. Acknowledge AI assistance.

The owner confirmed that no Figma URL exists. Do not ask repeatedly or create a Figma file without a request. Until a URL is supplied, maintain `design-source.json` as the code-side design contract. For future Figma work, create tokens, reusable components and component sets first, then page assemblies from instances. Use Auto Layout, editable Material UI vector icons, source-code descriptions, predictable `PS/` names, and explicit state variants. Store supplied URLs, node IDs and actual validation counts here and in the JSON; do not present code component counts as completed Figma work.

Reset the workspace scroll position when the route changes so the breadcrumb and page heading remain visible after navigating from long reports. Declare the document's smooth-scroll behavior for Next.js route transitions. Disabled buttons must be visibly subdued as well as functionally disabled.

## Stack and structure

Use Node.js 22, Next.js App Router, React, JavaScript, Magic UI source components, shadcn/Radix controls, Motion and Tailwind v4. CSS layer order is `theme, base, components, utilities`. Keep Material SVG icons locally in `components/design/icons.js`. Do not add Material UI, Emotion, Mantine or Lucide runtime packages. The production build is standalone. Preserve upstream component licenses in `docs/licenses/` and `THIRD_PARTY_NOTICES.md`.

- `app/layout.js`: metadata, optional analytics loader, Motion provider, common shell and feedback dialog.
- `components/design/Providers.js`: Motion reduced-motion configuration.
- `components/design/AppShell.js`: responsive navigation, page headings, footer and skip link.
- `components/design/primitives.js`: Radix/shadcn fields, Magic UI buttons, dialogs, alerts, badges and file picker with application callback contracts.
- `app/globals.css`: shared design tokens and shell/workspace layout.
- `components/PageSignalApp.js`: site/page/competitor form, request state and page drill-down confirmation.
- `components/optiscan/`: existing report, progress, tickets, UX and feedback modules. Historical internal folder names are compatibility details, not the visible brand.
- `lib/`: URL fetching, crawl evidence, normalized report schemas, personas, deterministic rules and optional provider clients.
- `app/api/analyze/route.js`: validation, streaming progress and analysis orchestration.
- `app/api/feedback/route.js`: optional, explicitly configured feedback delivery.

## Public design contract

Follow `docs/superpowers/specs/2026-10-06-magic-ui-design.md` and `design-source.json`; the earlier Material UI specification is historical.

Use canvas #fafbff, white rail and surfaces, ink #172033, muted text #59667d, dividers #e2e6ef and indigo accent #4f46e5. Use Segoe UI/Arial/system sans-serif throughout, with 44px desktop and 34px mobile headings. No external font fetch. Add Magic UI Shimmer Button for primary actions, Number Ticker for measured scores, Border Beam during active scans, and a static Dot Pattern in heading backgrounds. Keep dense report text still; do not invent metrics, landing-page sections or decorative motion that interferes with work.

Desktop: fixed 224px left rail with the PageSignal wordmark, Website analysis, UX review, Feedback and About destinations. Highlight the active route. Below 900px, show a compact top bar with a labelled menu button and accessible drawer. Main content has a small workspace breadcrumb, a bold sans-serif heading, restrained introduction, and a 1200px maximum width. Mobile gutters are 20px. Use thin dividers, small control radii, generous whitespace and minimal shadows. Respect reduced motion.

Website analysis title: “Find the next useful improvement.” Use a full-width white form with Radix underline tabs, URL fields, crawl scope or keywords and a clear primary action. Empty state explains Collect evidence → Review findings → Make a change; it must not display invented statistics. UX title: “See the page through another lens.” Feedback title: “Make sense of what people say.” Reports use horizontal score meters, numeric scores, light evidence sections, readable tables, semantic status labels and a single Export menu. Keep dialogs and exported PDF identity consistent.

## Workspaces and behavior

### Website analysis (`/`)

Preserve API modes `site`, `page`, `compare`. Site mode is the default. Normalize missing URL schemes to HTTPS. Page analysis accepts one to five comma/newline-separated keywords, with the first primary. Competitor comparison accepts the owner's URL and two alternatives. Site scope supports sample (5), deep (25) and sitemap (100) page limits, with controlled concurrency and bounded request duration.

Demo buttons use public example domains and submit real requests; no fake completed reports. Progress streams validation, fetching, evidence, optional providers, analysis and finalization. Disable mode/form controls while loading, support abort/cancel, show measured progress and estimated time without fabricated completion, then render the result. Page drill-down confirms that it replaces the site report and collects required keywords.

### Evidence and reports

Preserve normalized source evidence beside each recommendation. Deterministic evidence formula v1 governs SEO/UX scores; optional AI writes interpretation and tasks without overriding the measured score. Core Web Vitals are separate because lab runs vary. Clearly distinguish CrUX field data, Lighthouse lab data, missing evidence, blocked fetches, provider recovery and genuine target failures. Do not turn unavailable checks into passes or imply search volume, CPC, rankings or difficulty without corresponding data.

Provide mode-specific Overview, Keywords, Vitals, Security, Pages, Metrics and Tickets sections where relevant. Site passive security uses the existing 22 check IDs, invariant explanations, observed evidence, remediation and references. Preserve HTTP-to-HTTPS browser-compatible probing and selected response headers; exclude cookie values and suspected secrets from reports. DNSSEC and active vulnerability testing remain out of scope.

Tickets retain root cause, priority rationale, confidence, effort, affected URLs/elements, markup references, implementation hints and acceptance criteria. Group repeated causes without losing affected-page context. Completion is browser-local. Export ticket text for Jira, Markdown, Linear and GitHub; these are text formats, not remote synchronization. Provide full PDF, current-tab CSV and copied tables. Long PDF sections preserve all field text, continuation labels and page boundaries. Neutralize spreadsheet formula prefixes and escape literal quotes in CSV and copied tables, including headers.

### UX review (`/ux-audit`)

Use one primary persona and up to two distinct comparisons from the owner’s saved library or `lib/personas.mjs`: Alex (cautious explorer), Lucy (first-time evaluator, default), Sarah (experienced operator). The three built-in profiles are fictional examples with original neutral monogram SVGs. Custom profiles are supplied by their owners and use text monograms. Do not imply real customer research or demographic findings. Promoting a comparison to primary removes the duplicate. Keep one common evidence score while tailoring needs coverage, CTA fit, content fit, journey hypotheses, readiness, experiments, conflicts and acceptance criteria.

Six report tabs: Overview, Persona Analysis, Journey, Experiments, Evidence and Tickets. Optional Browserless capture uses static server-owned code, prefers reject/necessary-only consent, never accepts all, checks frames and verifies overlay clearance. Exclude unresolved/unavailable screenshots from model input; Lighthouse diagnostic screenshots alone cannot justify visual conclusions.

### Feedback (`/feedback`)

Support manual entry, CSV import, transparent deterministic classification, search/filtering, persona disclosure, review corrections, marking reviewed and removal. Classify persona, theme, journey, sentiment and severity conservatively. Weak/competing/no evidence stays Needs review; technical SEO terms must not imply a persona. Reviewed corrections persist; retired IDs require renewed review. Use `optiscan.feedback-library.generic.v1` to isolate earlier private browser records, without deleting the old namespace. This is not a shared team inbox. Do not add unapproved external review scraping.

A separate feedback dialog collects email/category/message and optional report context. It must explain unavailable delivery honestly. Report rating opens that dialog; it does not send without submission.

### About (`/about`)

Explain purpose, implemented capabilities, evidence limitations, fictional examples and AI assistance using local content. No internal documentation link. Preserve truthful attribution and distinguish user-provided origin from independently checked facts.

## Security and optional services

All integrations are optional and blank in `.env.example`. Support existing `SEO_OPS_` aliases. Without an OpenAI key use heuristics; without Google keys show unavailable metrics; without Browserless omit screenshot conclusions. Missing feedback configuration returns 503 before delivery. Feedback needs an HTTPS endpoint, a new server-side token and the owner's chosen recipient. No hardcoded recipient or tracking property. GA loads only with a validated build-time `NEXT_PUBLIC_GA_MEASUREMENT_ID`; leave off by default.

Guard destinations, redirects and connection-time DNS against private addresses. Canonicalize IPv4-mapped IPv6, bound encoded/decoded body sizes and use async decompression. Preserve these existing tested controls. Browserless needs independent private-network/metadata egress isolation. Public hosting also requires authentication, shared quotas, body/concurrency/spend limits and trusted proxy handling; the MVP does not provide those gateway controls. Do not deploy implicitly.

## Publication and verification

Keep secrets, `.env.local`, keys, `.local-only/`, output, scratch files and original Git history out of the public edition. Preserve private originals locally. `check:public` checks selected patterns and requires the actual Git root; it does not certify rights or scan history. `export:public` produces a non-overwriting source snapshot without `.git` or ignored files. The original history contains a prior feedback credential; the owner must revoke it. Do not push or copy original history, backdate commits, invent a license, or choose a public identity without the owner's input.

CI runs the public check, lint, tests and build without secrets. Container publishing is manual and opt-in. `npm start` serves the standalone build, copying static/public assets, on localhost by default; explicit host override uses `OPTISCAN_HOST`.

For every change, update this prompt and the design JSON. Run applicable tests, lint, production build and public-file checks. For interface changes inspect real desktop/mobile rendering, navigation, field labels, focus, dialogs, report states, persona controls and feedback interactions. Keep dated results and their limits; never carry old validation forward as proof of a new UI. Recheck dependency advisories and regenerate the public snapshot/ZIP after the final changes. The automated tests cover analysis/schema/security/export behavior, draft feedback persistence, and private-persona validation and request boundaries; browser checks must cover the changed presentation.

Preserve manual feedback corrections before review completion using `classificationEditedAt`; clear `reviewedAt` when a reviewer changes a field. Persist partially completed drafts through reloads. Reclassify untouched automatic records and records containing retired library values. Do not silently overwrite a manual draft with the automatic classifier.

When analytics is disabled, render null/false rather than an empty string inside `<head>`; otherwise React can replace the server-rendered head and lose styles during hydration. Verify the no-analytics state after hydration in the browser.

Report section navigation uses Radix underline tabs with keyboard support; inactive hover labels stay dark. Ticket expand/collapse controls expose descriptive accessible names. Public ticket IDs use the PS prefix, and crawl/provider/report messaging uses the PageSignal identity.

Lighthouse category displays also use numeric horizontal meters; preserve their own 90/50 status thresholds rather than the general report score thresholds. No conic-gradient score rings remain.

Earlier redesign-phase validation (6 October 2026, before saved personas): 62 tests passed, lint passed, production webpack build passed, 97 exportable files had zero selected-pattern findings, and fresh production-browser route checks had no console warnings/errors. Desktop 1280×720 and mobile 390×844 were inspected. The default Turbopack attempt encountered a local helper-port restriction; use `npm run build -- --webpack` if that environment limitation recurs. Record exact scope and untested integrations in `docs/RELEASE_VALIDATION.md`. The public package is a newly generated history-free snapshot, not the old visual design or private repository history.

The earlier redesign export also passed installation, the Webpack production build and all 62 tests without private environment configuration. Regenerate `output/public-release/` and `output/pagesignal-public-source.zip` plus its SHA-256 file for publication; prior packages are preserved only under ignored `.local-only/`. Keep the public package byte-for-byte consistent with the latest source.

## Private saved personas

See `docs/superpowers/specs/2026-10-06-saved-personas-design.md` and its implementation plan. ASSUMPTION: custom personas are private to signed-in owners, with Supabase Postgres/Auth. Keep public examples usable without a configured database. Resolve custom IDs with verified ownership server-side before auditing; never trust client-supplied persona content or owner IDs. Use RLS and bounded fields, preserve report snapshots, and document live-service setup and verification limits. This supersedes the previous fixed-only persona constraint; feedback classification remains on the fictional example library.

Custom persona fields are bounded to name 80, description/audit focus 1000, and 1–8 goals/blockers of 240 characters each. Use `supabase/migrations/202610060001_personas.sql` for owner-only RLS, immutable ownership, an owner/date index and a 50-persona cap guarded by a per-owner transaction advisory lock. Use `tests/sql/personas-isolation.sql` only in an isolated disposable database.

Saved persona routes use server-side Supabase SSR cookies and verify identity with getUser. Keep `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and exact-origin `APP_URL` optional and server-side. Use only publishable/legacy anon keys. Send email links to a fixed `/auth/callback`, then redirect to `/ux-audit`; auth pages do not accept arbitrary redirects. Refresh sessions only in route handlers, before starting an audit stream. Treat persona fields as untrusted model input. Private report/API responses must use private/no-store caching.

The UX workspace includes `components/personas/SavedPersonaLibrary.js`: email sign-in, private saved list, bounded create/edit editor, explicit delete confirmation and sign-out. The audit selector combines examples with owned saved profiles, disables a third comparison, and restores invalid selections to Lucy after deletion/sign-out. New profiles use monogram avatars. Show provider absence honestly, without pretending browser-only data was saved to Postgres.

Keep primary/comparison selections in one state update when the library changes so a deleted primary cannot leave Lucy selected both as primary and comparison. Signing out also clears the current report and rerun payload from the workspace; deletion alone preserves report snapshots.

Persona auth cookies are HttpOnly and SameSite=Lax, with Secure enabled for HTTPS. The browser uses same-origin application routes rather than a browser Supabase client. Preserve this arrangement unless the session design is deliberately revised.

Label the three shipped persona IDs as Example; `core` is not an ownership marker. Only database-backed profiles are labelled Saved.

Persona setup instructions are in `docs/PERSONAS_SETUP.md`. GitHub CI also runs the SQL migration/isolation suite against a disposable PostgreSQL 17 service with test-only auth stubs; never run that bootstrap against real Supabase. Local SQL tests used PostgreSQL 14.19. Browser CRUD/audit checks used real local Postgres with a disposable Auth/Data API test double, never a production authentication bypass. Live hosted Auth/email/refresh remain unverified.

Maintain a 33-entry code component inventory and four page frames in `design-source.json`, including private-library, editor, sign-in and delete-dialog states. Keep verification phase/date explicit; regenerate history-free publication artifacts after the saved-persona implementation.

Saved-persona verification on 6 October 2026: all 70 Node tests, lint and the production Webpack build passed; 114 source files had zero selected-pattern findings. Fresh-cluster SQL bootstrap, migration and owner isolation/validation/quota tests passed on PostgreSQL 14.19. Desktop/mobile browser CRUD and custom-audit checks passed with a disposable Auth/Data API test double and real Postgres; the final unconfigured production view has no observed console warnings/errors. The public snapshot now contains 113 source files. Hosted Supabase email and refresh remain unverified.

The saved-persona clean export independently passed installation (421 packages), all 70 tests and the Webpack production build without `.env.local`. Keep the database test bootstrap restricted to an empty disposable cluster with no existing test auth roles. Export 113 source files, compare ZIP contents with the snapshot, and include its SHA-256 digest.

## Magic UI implementation

USER_PROVIDED: replace Material UI with Magic UI. Follow `docs/superpowers/specs/2026-10-06-magic-ui-design.md`. Use official source components, shadcn/Radix accessible controls, Tailwind and Motion; preserve Material icons as attributed local vectors. Retain all application and Postgres persona behavior, no Figma source, and verify reduced motion, keyboard navigation, forms/dialogs and desktop/mobile reports before refreshing the public archive. This supersedes the earlier Material UI design contract.

The Magic UI migration keeps the shared control callback contracts while replacing their implementation with Radix/shadcn. Controlled dialogs record and restore their actual opener. Local SVG icons preserve 61 Material paths; dependency licenses and adapted component provenance must ship with the public source.

Magic UI number tickers render the final value on the server and expose it accessibly; animation is decorative and respects reduced motion. Keep local Material icons compatible with the JSX test loader by retaining the explicit React import.

Keep registry components in `.js` files with relative imports, matching the existing JSX test-loader conventions. Components from future CLI additions may need the same extension/import normalization.

Let Radix generate dialog title IDs and aria-labelledby associations, including feedback and navigation; do not override them with hardcoded IDs or undefined props. The mobile navigation uses an explicit left placement variant in the Radix panel, replacing centered translate utilities at the source. A CSS-only reset is insufficient: the production optimizer may merge independent transform/translate resets. Verify panel geometry in the production build.

Buttons expose aria-busy and a decorative spinner while loading; feedback submission also changes its label to Sending…. Persona row actions and dialog Cancel buttons use text/ghost styling, reserving shimmer for primary actions.

Registry installation uses the shadcn Radix new-york configuration in `components.json`, with Magic UI registry explicitly named. The CLI uses Lucide as a supported generation setting; immediately replace generated icon imports with the local Material vectors. No Lucide package ships. Check fields, tabs, menus, dialog titles and focus, loaded/empty/error states, disabled actions and desktop/mobile workflows after any future UI update.

Retain both the MUI package MIT notice and the underlying Google Material Icons Apache-2.0 license when distributing the local vectors. Live hosted Supabase email/refresh and a forced reduced-motion browser session remain outside the checks performed for this library migration.

Magic UI verification (6 October 2026): 70 tests, lint and the Webpack production build passed; the 140-file public-source pattern scan found no selected patterns. Browser checks used 1280×800 and 390×844, including persona CRUD with real disposable Postgres and an Auth/Data API test double, a custom UX audit, keyboard tabs/export menu, local feedback draft persistence/review/removal, navigation, dialog labels and focus restoration. The current clean source package has 139 files; earlier 113-file packages predate Magic UI.

The final Magic UI production drawer must measure x=0 and y=0 at 390×844. Preserve the explicit left placement variant through future component updates. The centered feedback dialog was also checked at 350px wide with no horizontal overflow. Final validation belongs in the dated Magic UI section of `docs/RELEASE_VALIDATION.md`.

Final clean-export verification (6 October 2026): a fresh 139-file snapshot installed 453 packages, passed all 70 tests and passed the Webpack production build without private configuration. Keep the current ZIP byte-identical to the exported sources, with a SHA-256 file; never include original Git history. No public repository or hosted service has been connected.

## GitHub repository link — 7 October 2026

USER_PROVIDED: the personal repository is https://github.com/Behzad85/page-signal. Add `components/design/GitHubStars.js` to the shared workspace top bar, aligned to the right of the breadcrumb on every route and wrapping cleanly on narrow screens. Use the official GitHub Octicons mark (MIT notice in `docs/licenses/octicons.txt`) alongside the GitHub label and exact formatted star count. Keep other interface icons in the existing Material system.

Read `stargazers_count` from the fixed public GitHub repository API, without credentials or a referrer. Fetch on mount and every five minutes while visible; refresh when returning to the tab if the last attempt is five minutes old. Abort after eight seconds and on unmount. Validate a nonnegative safe integer. Render an ellipsis while loading and a dash when unavailable, with descriptive accessible labels; never substitute a fabricated zero or stale count. The link always remains usable, opens the exact repository in a new tab and uses noopener/noreferrer. GitHub requests do not block audits, rendering or production builds.

The website-entry grid uses an explicit single minmax(0, 1fr) column (`grid-cols-1`) so intrinsic form/tab widths cannot expand the page at 320px. Tabs scroll inside their own container. Preserve this constraint while keeping the GitHub header link independently wrapping.

GitHub-header validation (7 October 2026): lint, all 70 tests and Webpack build passed. Browser loading-to-live-count (0), exact repository new-tab link, desktop/mobile rendering and narrow-screen tab interaction were checked with no observed console warnings/errors. The refreshed history-free export contains 141 files (142-file pattern inventory, 0 findings). Publication remains pending GitHub write access; the original remote/history stays private.

## Public publication — 7 October 2026

USER_PROVIDED: publish the prepared public version to `https://github.com/Behzad85/page-signal` using the `Behzad85` account. VERIFIED through GitHub CLI on 7 October 2026: active account Behzad85 (ID 4369000), administrator access, destination initially empty. Use public commit identity `Behzad85 <4369000+Behzad85@users.noreply.github.com>`. Create a fresh repository from the reviewed export, with no original private history or configuration. Keep the original workspace remote unchanged. Application licensing remains undecided; preserve all third-party notices and do not describe the project as licensed open source.

VERIFIED publication, 7 October 2026: initial public snapshot pushed to `Behzad85/page-signal` on `main` through Behzad85; initial commit `dabc8c2e87d43cacbba348fd992a07668823098d`. Public author and committer use the Behzad85 noreply identity. Future public changes should be committed in the independent publication checkout (or a new clone of the public repository), never by pushing the original private history. Follow validation runs at https://github.com/Behzad85/page-signal/actions. This publishes source only; hosted deployment and hosted Supabase setup remain separate.
