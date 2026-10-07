# PageSignal Next Version Roadmap

This file stores future product priorities, buyer-feedback notes, and roadmap items that should be considered after the current MVP. Keep it updated whenever new gaps, ideas, or next-version requirements are identified.

## Current Implementation Notes

- Issue deduplication and root-cause grouping now exists in the MVP at the ticket level. Future versions should make the grouping editable, explainable, and persistent across reruns.
- Impact / effort / confidence scoring now exists in the MVP at the ticket level. Future versions should calibrate scores with real GSC/analytics data and allow team-specific effort estimates.
- Deeper Website Scan crawl now exists as a bounded shallow crawl sample of up to 5 same-origin pages from sitemap/internal-link discovery. Future versions should expand this into configurable crawl budgets, template clustering, and historical crawl comparisons.
- Page-level Website Scan drill-down is a good next UX step. Keep the default Website Scan as a site-level/root-cause summary, then let users open each crawled page from the Pages Crawled list into a detail drawer or page detail view with its own score, issues, tickets, markup clues, and metrics. Avoid showing every page's full analysis by default because it will make the report noisy again.
- Frontend dashboard code has been split out of the former monolithic `components/PageSignalApp.js` into feature modules under `components/optiscan/`. Future multi-page, auth, history, saved reports, and integration work should extend those modules instead of rebuilding a single dashboard file.
- If a database is added, MariaDB is the preferred default unless product requirements later point to a different store.
- AI Visibility Score has not been implemented yet. Treat it as a scoring model to agree before adding product logic.

## Proposed AI Visibility Score

Use this as a 0-100 proxy score, not a guaranteed measure of whether a brand appears in AI answers. Real validation later needs GSC data, AI referral logs, brand-query tracking, and possibly third-party AI visibility/citation tracking.

- **Answer extraction and clarity: 25 points**
  - Clear concise answers, FAQ/definition sections, descriptive headings, and answer-ready summaries.

- **Entity clarity and schema: 20 points**
  - Organization/product/service/person clarity, JSON-LD schema, sameAs profiles, canonical entity naming, and consistent brand facts.

- **Source evidence and citations: 15 points**
  - Visible supporting evidence, source pages, author/about/contact trust signals, and cited references where appropriate.

- **Crawlability and AI discoverability: 15 points**
  - HTML fetch success, indexability, robots/sitemap health, `llms.txt`, and no blocking of major crawler-style requests.

- **Content depth and information gain: 15 points**
  - Useful unique information, complete topic coverage, examples, comparisons, and non-generic detail competitors do not provide.

- **Performance and accessibility support: 10 points**
  - Fast enough pages, stable rendering, accessible content, and minimal client-side barriers that could make extraction harder.

For Competitor's Analysis, show the user's AI Visibility Score beside competitor proxy scores and explain the largest weighted deltas. Do not present it as an official Google, OpenAI, or ChatGPT ranking metric.

## Buyer Audit: Important Missing MVP Capabilities

1. **Report history and saved projects**
   - Save scans by site, client, and project.
   - Support reruns over time and make progress easy to compare.

2. **Evidence transparency**
   - Show exactly why each issue was raised.
   - Include raw evidence where useful: HTML snippets, selectors, HTTP status, crawl source, PageSpeed/CrUX source, and markup references.

3. **Google Search Console integration**
   - Pull real queries, clicks, impressions, CTR, average position, indexed/not-indexed states, and URL Inspection-style validation.
   - Connect recommendations to real search demand and post-fix validation.
   - Strategy: enable the Google Search Console API in Google Cloud, add OAuth with the `webmasters.readonly` scope, map scanned URLs to verified GSC properties, securely store refresh tokens, and pull Search Analytics query/page/date data plus sitemap and indexing signals. MariaDB is the likely persistence layer if/when auth and saved projects are added.

4. **GA4 / analytics integration**
   - Connect SEO issues to traffic, landing-page performance, conversions, and business impact.

5. **Issue deduplication and root-cause grouping**
   - Group overlapping recommendations into root causes.
   - Reduce noisy duplicate tickets and make output feel more senior and implementation-ready.
   - MVP baseline implemented: tickets are grouped by root cause and affected URL.

6. **Impact / effort / confidence scoring**
   - Add estimated SEO impact, implementation effort, confidence level, and priority rationale to each issue or ticket.
   - MVP baseline implemented: tickets include impact, effort, confidence, numeric scores, and priority rationale.

7. **Before / after tracking**
   - Let users mark tickets fixed, rerun scans, and see what improved or regressed.
   - Track score changes, resolved issues, new issues, and remaining work.

8. **Deeper website crawl**
   - Expand Website Scan beyond a single homepage/page.
   - Crawl sitemap URLs, important linked pages, templates, internal-link graph, and indexable page sets.
   - MVP baseline implemented: Website Scan now supports Sample crawl up to 5 pages, Deep crawl up to 25 pages, and Sitemap crawl up to 100 pages from sitemap/internal-link discovery.
   - Next UX step: clickable per-page drill-down from Website Scan, while keeping the overview focused on cross-site patterns and root causes.

9. **Keyword intelligence with real demand data**
   - MVP baseline implemented: Page Audit and Website Scan include a Keywords tab for on-page keyword coverage, prominent terms, topic gaps, page-topic mapping, and cannibalization clues from SEO-relevant page areas: title, meta description, headings, visible copy, internal anchors, image alt text, URL slug, and structured data.
   - Future version: combine the MVP keyword evidence with GSC query data, impressions, clicks, CTR, average position, and landing-page mappings so keyword recommendations reflect real search demand and performance.

10. **Richer competitor comparison**
   - Show exactly where competitors win across headings, schema, content sections, entities, FAQs, snippets, links, Core Web Vitals, and AI-readiness signals.

11. **Authentication and team workflow**
   - Add accounts, saved workspaces, team members, permissions, and client/project separation.

12. **White-label and shareable reports**
   - Add branded PDFs, share links, client-friendly summaries, editable notes, and report templates.

13. **Crawler reliability controls**
   - Add crawl profile settings, retry controls, custom user agent, crawl logs, and clear blocked-access guidance.

14. **UX Audit follow-ups**
   - Desktop screenshot comparison using the on-demand desktop Lighthouse run or a desktop browserless viewport.
   - Slice very tall full-page screenshots into segments before the vision pass so fine detail survives model downscaling (current cap relies on jpeg quality 60 + 1.5MB limit).
   - Competitor UX comparison mode reusing the compare pipeline with UX evidence.
   - Deeper interaction heuristics: focus order, skip links, sticky-header overlap, and contrast sampling from the screenshot.
   - Recorded multi-step journeys, authenticated-page execution, and VPN-only target support remain separate future capabilities.

## GSC Gap-Closing (Tier 1: standalone, no GSC account needed)

These emulate Google Search Console value predictively, so they work on any URL including competitors — PageSignal's edge over GSC, which only covers a verified property.

- **Rich-result eligibility validation — IMPLEMENTED.** `lib/richResults.js` validates detected JSON-LD against Google's required/recommended properties and classifies each type eligible/incomplete/invalid. Surfaced in the Technical SEO category, Page Audit's Technical tab, and tickets. Future: expand the rule set (more types, monetary/availability checks for Product), per-page rich-result rollup in Site Analysis crawl, and a dedicated "lost rich results" diff across reruns.
- **Predictive index-coverage diagnostics — NEXT.** Emulate GSC's exclusion reasons from already-collected signals: `noindex` meta/header, canonical-points-elsewhere, robots-blocked, redirect chains, soft-404 (200-but-empty/thin), and 4xx/5xx from the crawl. Output "Google would likely not index this because…" per page.
- **Crawl-stats roll-up on the multi-page crawl.** Aggregate response-code distribution, redirect-chain depth, and orphan pages (in sitemap but not internally linked) from the existing crawl sample.

Tier 2 (the GSC integration itself — real queries/clicks/impressions/position + URL Inspection) remains item #3 above; it requires OAuth, property mapping, and persistence.

## Productization Priorities

- Move Feedback Intelligence from browser-local storage to MariaDB-backed team workspaces with access controls, import history, audit logs, and shared review state.
- Use confirmed feedback corrections as labelled examples for a versioned AI classifier, while retaining confidence thresholds, explanations, and human review.
- Consider external review connectors only after approved API access and data-governance review; do not rely on rendered-page scraping for Google, Trustpilot, or Reddit.
- Dashboard home with recent scans, open issues, score trends, and projects.
- Clear onboarding flow for OpenAI, Google CrUX/PageSpeed, Search Console, and analytics keys.
- Confidence labels such as `High confidence`, `Estimated from partial evidence`, and `Blocked by crawler`.
- Pricing and usage controls: number of scans, API-cost protection, quotas, and scan limits.
- Direct export integrations for Jira, Linear, Trello, or GitHub Issues.
- Fix-validation workflow for developers and SEO owners after changes ship.

## Current Product Assessment

The current MVP is a strong analysis and reporting tool. To feel like a paid product, it needs to become a system of record for SEO improvement work: persistent projects, trusted evidence, real performance integrations, issue lifecycle management, and repeatable developer handoff.
