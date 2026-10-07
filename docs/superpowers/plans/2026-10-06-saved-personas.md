# Saved personas implementation plan

Execute inline in the current working tree, preserving all public-edition changes.

**Goal:** Create and manage private Postgres personas and use them in UX audits.
**Architecture:** Supabase Auth cookies and owner-scoped Data API access in route handlers; database RLS; shared persona normalization; MUI management dialogs in the UX workspace.
**Stack:** Next.js 16, React, MUI, Supabase SSR/JS, PostgreSQL.
**Spec:** ../specs/2026-10-06-saved-personas-design.md

- [x] Write failing validation and selection tests. Add `lib/customPersonas.mjs` for strict field validation/row conversion and generalize persona selection to accept an explicitly authorized library.
- [x] Add SQL migration and transaction-based SQL integration tests for two owners, anonymous denial, updates, deletes, ownership changes, limits and invalid rows. Run them against isolated local Postgres.
- [x] Add optional server-only Supabase configuration/client helpers; same-origin, bounded JSON request helpers; persona CRUD routes and sign-in/callback/sign-out routes. Keep provider errors private and responses uncached.
- [x] Resolve owned persona IDs before analysis, snapshot their public fields into reports, and mark user content as data in prompts. Test custom persona heuristic/export contracts and denied IDs.
- [x] Add MUI saved-persona list, editor, deletion confirmation and email sign-in dialog; integrate selection/reset/disabled behavior in the UX workspace.
- [x] Run tests, lint, production build and browser checks. Record actual database/Auth verification limits, update recreation/design/setup/release documents and regenerate the clean source package.
