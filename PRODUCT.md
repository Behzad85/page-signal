# PageSignal Product Document

## Product Summary

PageSignal is an SEO audit workspace that turns website, page, competitor, and Core Web Vitals evidence into prioritized implementation work.

The product is designed for SEO teams, growth teams, content teams, and developers who need more than a generic audit score. PageSignal scans public URLs, extracts crawl and performance evidence, analyzes the result with AI or local heuristics, and converts findings into clear report sections, exportable tables, and developer-ready tickets.

## Problem Statement

SEO work often breaks down between diagnosis and execution. Most audit tools can identify issues, but teams still need to interpret the findings, decide what matters, translate them into developer tasks, and prove the impact later.

PageSignal is trying to solve five connected problems:

1. **SEO findings are difficult to operationalize.**
   Audit outputs are often long lists of warnings. Teams need prioritized tickets with user stories, technical details, affected elements, and acceptance criteria.

2. **Technical SEO, content quality, performance, and AI discoverability are fragmented.**
   Teams usually need separate tools for crawlability, on-page SEO, Core Web Vitals, content analysis, competitor review, and reporting. PageSignal brings those signals into one workflow.

3. **SEO recommendations often lack developer context.**
   Developers need to know where to look: markup clues, likely selectors, affected URLs, missing tags, crawl status, and concrete implementation hints.

4. **AI search and answer extraction are becoming harder to evaluate.**
   Traditional SEO checks do not fully answer whether a page is easy for AI systems to summarize, cite, and extract answers from. PageSignal includes AI readiness, entity clarity, information gain, and answer-extraction signals.

5. **Reports are hard to reuse with stakeholders.**
   SEO teams need clean exports for spreadsheets, Jira, GitHub, Linear, PDFs, and internal reports without manually reformatting every audit.

## Target Users

- SEO managers who need fast, explainable site and page audits.
- Content strategists who need keyword, topic, and information-gain guidance.
- Growth teams comparing their site against competitors.
- Developers who need precise implementation tickets instead of vague SEO warnings.
- Founders or operators who need a practical MVP-level SEO diagnosis without a large tool stack.

## Product Goals

- Give users a clear SEO health view with evidence, not just a score.
- Convert findings into prioritized, copyable implementation tickets.
- Make Core Web Vitals understandable for non-specialists.
- Help teams compare their site against competitors using the same evidence model.
- Support AI-era SEO by checking answer extraction, entity clarity, citations, and discoverability.
- Keep analysis useful even when OpenAI or Google API keys are unavailable by using local heuristic fallbacks.

## Current Product Modes

### 1. Site Analysis

Scans a website URL and produces a site-level SEO diagnosis.

It checks technical SEO, on-page SEO, content quality, crawl/indexing signals, schema, social links, internal links, media, accessibility clues, Core Web Vitals, AI readiness, and repeated crawl patterns across sampled pages.

### 2. Page Analysis

Audits a single page against up to five target keywords.

It focuses on page-level technical SEO, keyword coverage, content gaps, missing topics, AI readiness, and implementation actions.

### 3. Competitor Analysis

Compares a user website against two rival URLs.

It reviews technical SEO, content depth, crawlability, structured data, AI readiness, entity clarity, heading structure, and answer-extraction quality across all three sites.

### 4. UX Audit Workspace

Audits one rendered page against one primary and up to two comparison personas from the fictional example Alex, Lucy, and Sarah profiles or the signed-in owner’s saved personas.

The dedicated `/ux-audit` workspace combines consent-verified screenshot review with accessibility, mobile, interaction, readability, and Core Web Vitals evidence. It explains needs coverage, decision readiness, CTA suitability, content fit, journey implications, experiments, persona conflicts, and persona-tagged acceptance criteria. The numeric UX score remains based on observed page evidence so results stay comparable across persona selections.

## Current Features

### Analysis And Crawl

- Public URL analysis through a server-side API route.
- Jina Reader integration for readable Markdown extraction.
- Raw HTML signal extraction for title, meta description, headings, canonical tags, schema, links, image alt text, social profile links, robots.txt, sitemap.xml, and llms.txt.
- Browser-like crawler profiles to reduce avoidable 403 responses.
- Clear crawl-access warnings when a site blocks bots or returns non-200 statuses.
- Bounded multi-page crawl for Site Analysis using sitemap and internal-link discovery.
- Crawl scope controls for sample, deeper, and larger sitemap-based scans.
- Local heuristic fallback when OpenAI is not configured or analysis fails.
- Server-side OpenAI analysis using strict normalized JSON when an API key is available.
- Optional email-link sign-in and private Postgres persona library: create, edit and delete up to 50 profiles with goals, blockers and audit focus. Database row-level security restricts each profile to its owner; setup is documented in `docs/PERSONAS_SETUP.md`.
- Dedicated persona-aware UX Audit workspace with Lucy selected by default, one primary persona, and up to two comparison personas.
- Shared persona definitions covering goals, blockers, audit focus, and heuristic recommendations across Feedback Intelligence and UX Audit.
- Original neutral SVG avatars created for the public release.
- Consent verification before screenshot evidence can influence AI conclusions; unresolved screenshots are excluded while structural analysis continues.
- Persona needs coverage, decision readiness, CTA suitability, content fit, journey hypotheses, experiments, conflict resolution, and persona-tagged acceptance criteria.
- Persona-specific report context, tickets, CSV rows, and PDF content without inventing unsupported page findings or conversion uplift.

### Core Web Vitals And Performance

- Google CrUX field data support for LCP, INP, and CLS.
- Google PageSpeed Insights Lighthouse diagnostics.
- Mobile-first Vitals results for faster initial reports.
- On-demand Desktop Lighthouse fetch.
- Plain-English explanations for LCP, INP, CLS, TBT, CrUX, and Lighthouse diagnostics.
- Clear provider-status messages when Google API keys are missing, restricted, invalid, disabled, rate-limited, or timing out.

### Reports

- Report header with URL, run time, duration, pages crawled, re-run, share, and a consolidated Export menu.
- Mode-specific report tabs.
- Site Analysis tabs: Overview, Keywords, Categories, Crawled pages, Vitals, Tickets, and Metrics.
- Page Analysis tabs: Overview, Keywords, Categories, Vitals, Technical SEO, Content Strategy, Action Plan, Tickets, and Metrics.
- Competitor Analysis tabs: Overview, Categories, Vitals, Wins, Gaps, Action plan, Tickets, and Metrics.
- UX Audit tabs: Overview, Persona Analysis, Journey, Experiments, Evidence, and Tickets.
- SEMrush-style audit categories: On-Page SEO, Technical SEO, Off-Page SEO, Page Speed & Core Web Vitals, and Social Media.
- One prominent Export menu for full-report PDF, active-tab CSV, and active-tab copy.
- Full PDF report export with visual summaries and tabular sections where appropriate.

### Ticketing And Workflow

- Dedicated Tickets tab for prioritized implementation work.
- Stable ticket IDs based on root cause, URL, and title.
- Tickets grouped by root cause to reduce duplicate tasks.
- Each ticket includes priority, category, work type, URL context, user story, technical details, shared and persona-specific acceptance criteria, affected elements, markup references, confidence, effort, and rationale.
- Copy ticket formats for Jira, Markdown, Linear, and GitHub Issue.
- Client-side filters for priority, category, work type, URL, sort order, and free-text search.
- Done-state persistence in local storage.

### Keyword Analysis

- Keyword analysis based on SEO-relevant page areas rather than raw crawl character counts.
- Checks title, meta description, headings, visible body copy, internal anchor text, image alt text, URL slug, and structured data text.
- Shows entered keyword coverage, prominent terms, topic gaps, page topic map, and cannibalization clues where available.

### Competitor Comparison

- Three-site scoreboard with normalized scores.
- User strengths.
- Competitor advantages.
- Competitive gaps.
- Comparison-based action plan.
- Tracking recommendations.
- Domain-based competitor labels instead of generic labels like “Competitor 1.”

### Feedback And Analytics

- Feedback button available in the app shell.
- Report-specific useful / not useful feedback prompt.
- Feedback API route that emails submissions to the configured recipient.
- Dedicated Feedback Intelligence workspace for manually entered, CSV-imported, and successfully submitted first-party feedback.
- Transparent feedback classification by the fictional example three behavioral personas, theme, journey stage, sentiment, and severity.
- Built-in persona library for Alex (cautious explorer), Lucy (first-time evaluator), and Sarah (experienced operator), with behavior-led descriptions and core/non-core context.
- Conservative persona inference based on buying experience, confidence, budget, need for guidance, and need for control; generic job-role or SEO vocabulary does not imply a persona, and persona suggestions appear only when the feedback contains supporting evidence.
- Confidence scoring and a Needs review queue with suggested classifications, editable corrections, and reviewed-state tracking.
- Browser-local persistence for the first validation release, with clear disclosure that it is not yet a shared team inbox.
- Persona requests routed through the existing feedback form.
- Optional, disabled-by-default GA4 analytics tracking for high-signal product events such as scans, mode selection, report-tab navigation, exports, desktop vitals requests, sharing, reruns, and feedback-classification actions.
- Sanitized analytics properties to avoid sending raw report content, crawl evidence, keyword text, or query-string URLs.

### Deployment And Configuration

- Dockerfile for containerized deployment.
- GitHub Actions checks plus manual Docker image build and optional publishing to the current repository’s GHCR namespace.
- Server-side environment variable support for local names and deployment vault aliases:
  - `OPENAI_API_KEY` or `SEO_OPS_OPENAI_API_KEY`
  - `OPENAI_MODEL` or `SEO_OPS_OPENAI_MODEL`
  - `GOOGLE_CRUX_API_KEY` or `SEO_OPS_GOOGLE_CRUX_API_KEY`
  - `GOOGLE_PAGESPEED_API_KEY` or `SEO_OPS_GOOGLE_PAGESPEED_API_KEY`
  - `PAGESPEED_TIMEOUT_MS` or `SEO_OPS_PAGESPEED_TIMEOUT_MS`

## Differentiation

PageSignal is not just another audit checklist. Its main difference is that it treats SEO analysis as an operational workflow:

- Evidence is gathered first.
- Findings are normalized into report sections.
- Issues are grouped into practical categories.
- Recommendations become tickets.
- Tickets include developer clues.
- Outputs can be exported directly into existing team workflows.

This makes PageSignal useful for both strategic SEO review and day-to-day implementation planning.

## MVP Boundaries

The current MVP does not yet include:

- User accounts or team workspaces.
- Saved report history backed by a database.
- Google Search Console integration.
- Backlink provider integration for real Off-Page SEO metrics.
- Native Jira, Linear, or GitHub API sync.
- Scheduled recurring scans.
- Multi-user collaboration.
- Shared feedback storage, learned classification from reviewer corrections, and external review-platform connectors.

These are natural next-version features once the core audit-to-ticket workflow is validated.

Public release: personas and avatars are fictional generic examples created for this version, not customer research. Feedback delivery requires all three FEEDBACK_ variables; analytics requires a valid build-time NEXT_PUBLIC_GA_MEASUREMENT_ID. See README.md and SECURITY.md for installation and deployment boundaries.
