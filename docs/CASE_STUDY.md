# Engineering case study: from audit evidence to implementation work

## Problem and approach

Website audits produce observations that still need interpretation and engineering handoff. PageSignal brings evidence gathering, diagnosis, prioritization, and ticket export into one workflow. Its central design decision is to retain source evidence next to recommendations so a reader can assess what was observed and what is inferred.

This document describes implemented behavior visible in the source. It does not claim product adoption, commercial impact, industry recognition, or sole authorship.

## Project origin

USER_PROVIDED, 6 October 2026: the owner states that they built this from scratch as an independent side project, without an employer instruction, and have permission to publish the application code. This is an attributed statement, not an independent ownership determination. The public edition replaces the earlier interface, UI library, visual assets, and company persona material. AI assistance is acknowledged.

## Decisions a reviewer can inspect

| Decision | Why it matters | Source and validation |
| --- | --- | --- |
| Separate public identity from analysis behavior | A Magic UI interface with Radix controls and a light design system can change presentation while retaining tested report/data contracts | `components/design/`, `design-source.json` |
| Separate evidence gathering from AI interpretation | A missing provider result does not have to stop the audit or become an invented measurement | `lib/analyzeSeoContent.js`, mode-specific schema modules |
| Guard server-side destinations and bound decompression | User-supplied URLs and compressed responses cross a network/resource boundary | `lib/urlGuard.js`, `tests/urlGuard.test.mjs` |
| Explain crawl-provider recovery | A blocked intermediary is different from an inaccessible target page | `lib/crawlDiagnostics.mjs`, `tests/crawlDiagnostics.test.mjs` |
| Compute passive security evidence deterministically | A language model should not decide whether an observed header or transport check passes | `lib/securitySchema.mjs`, `tests/securityPosture.test.mjs` |
| Require consent verification for screenshots | Unresolved consent overlays must not influence visual conclusions | `lib/consentCapture.mjs`, `tests/consentCapture.test.mjs` |
| Keep persona needs distinct while keeping the evidence score stable | Multiple audience needs can produce different recommendations without altering measured page evidence | `lib/uxAuditPrompt.mjs`, `lib/uxAuditSchema.js`, `tests/uxPersona.test.mjs` |
| Store custom personas with owner isolation | Verified sessions, owner-scoped queries and Postgres row-level security protect private profiles while preserving public examples | `lib/persona/server.js`, `supabase/migrations/202610060001_personas.sql`, `tests/sql/personas-isolation.sql` |
| Classify feedback conservatively | Ambiguous feedback should invite review rather than assert a persona with false certainty | `lib/feedbackClassification.mjs`, its tests |
| Export actionable tickets and complete reports | Findings become work with acceptance criteria; long security evidence is paginated rather than truncated | `components/optiscan/tickets.js`, `pdfExport.js`, security PDF tests |
| Make installation-specific services explicit | A new evaluator's copy must not report to a previous deployment's analytics or feedback account | `lib/analytics.js`, `lib/sendFeedbackEmail.js`, `tests/publicConfiguration.test.mjs` |

## Reproducible evaluation

Follow the README setup, run the checks, and audit a public example domain. Compare a heuristic-only run with an AI-enabled run if you have an API key. Inspect a failed-fetch report, the Tickets tab, exported CSV/PDF, and the dedicated UX workspace. Distinguish absent field measurements from available lab results and structural evidence from verified screenshot evidence.

## Evidence still needed to demonstrate impact

Code and tests show implementation. Stronger impact claims need dated external evidence: actual users and their permission to quote feedback, real contributions/issues, documented use by a team, independently corroborated outcomes, or a measured before/after study with its method and limits.

A project owner should describe their own product, design, engineering, and validation contributions accurately, acknowledge collaborators and AI assistance, and link genuine original commits or records where disclosure is permitted. A public snapshot's first commit date is its publication date; it is not evidence of when the original work began. Do not invent metrics, testimonials, contributors, stars, or adoption.
