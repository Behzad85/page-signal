# Private saved personas

Requested: let users create personas in Postgres for the public edition. ASSUMPTION pending the owner's preferences: private ownership with email sign-in, using Supabase Postgres/Auth. No new hosted resources or outbound sign-in emails are provisioned by this change.

## Data and access

Store custom personas in `public.personas`: UUID id, authenticated owner_id, name (80 characters), description (1000), goals and blockers (1–8 nonempty strings each, 240 characters each), audit_focus (1000), created_at and updated_at. Check limits in Postgres and in request validation. Limit each account to 50 personas with a per-owner transaction advisory lock and insert trigger, including direct Data API inserts. Scope CRUD through the verified user's JWT; never accept owner_id from a form or use a service-role key. Enable and force RLS with owner-only select/insert/update/delete policies. Index owner_id and updated_at. Use generated monograms; no uploads or remote avatar URLs.

## Authentication and API

Use `@supabase/ssr` only in route handlers, with Next.js cookies. The browser calls same-origin application endpoints; no server-rendered protected pages depend on cookie refresh, so a global auth proxy is unnecessary. Every persona request validates the user with Supabase Auth. Refresh cookies in route handlers. Magic-link sign-in uses the configured application URL and a fixed callback to `/ux-audit`; no arbitrary next/redirect values. Sign-out clears the session. Enforce same-origin JSON requests for mutations, bounded input, private/no-store responses and generic provider errors. Include clear unconfigured, signed-out, loading and failure states. Existing public example audits remain available without auth.

## UX and analysis integration

In the existing UX workspace add a Saved personas section, a sign-in dialog, and a labelled editor for name, description, goals, blockers and audit focus. Allow create/edit/delete only when signed in. Confirm deletion of a saved persona. Keep the three read-only fictional examples. Select one primary and up to two comparisons across examples and owned saved personas. On deletion/sign-out restore invalid selection to Lucy and remove invalid comparisons. Disable mutations while an audit is running.

The client sends IDs only. Resolve UUIDs from the authenticated database on the server before fetching the target URL. Reject missing or inaccessible IDs with the same message; preserve the existing selection limits. Convert database rows to the established persona contract, with conservative generic heuristic task/impact text. Reports carry a snapshot of the selected persona content; later edits/deletion do not rewrite an already displayed report. Do not include owner IDs/emails in reports or analytics. Persona content is user data, not an instruction to the AI. Feedback classification stays based on the fixed fictional library in this release.

## Verification and release

Use Node tests for validation, selection, prompt/report preservation and unauthenticated behavior. Run the migration and owner-isolation checks against an isolated local Postgres cluster where available. Inspect real UI states in the in-app browser, test all existing tests, lint and production build. Document any live Auth/email or Supabase-specific verification that cannot be performed without a configured project. Update init.md, design-source.json, README, setup/security documents and public source artifacts. Do not overwrite local secrets, push, deploy or claim a hosted database was configured.
