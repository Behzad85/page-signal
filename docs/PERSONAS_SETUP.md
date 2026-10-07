# Enable private saved personas

The optional persona library uses Supabase Postgres and email-link authentication. Saved personas belong to their creator; they are not a public directory. Users can create, edit, delete and select them for UX audits. The three fictional examples work without a database or sign-in. Feedback classification still uses the fixed example library.

## Connect a Supabase project

1. Use a project you control. In its SQL editor, run `supabase/migrations/202610060001_personas.sql` once, or apply that migration through your normal migration workflow. It creates the `public.personas` table, checks, ownership policies, grants, index and quota trigger. Do not run the test bootstrap in a real project.
2. Keep the Data API enabled for the `public` schema. Use the project's URL and **publishable** key (a legacy `anon` key also works). This app rejects secret/service-role keys because those can bypass ownership rules.
3. Enable email authentication. Use Supabase's normal magic-link template containing `{{ .ConfirmationURL }}`. Configure the Site URL to the app origin and allow the exact `/auth/callback` redirect URL for each deployment. The app uses PKCE and exchanges the returned `code` on the server. Custom token-hash templates need a different callback and are not supported by this implementation.
4. Configure production email delivery and the provider's abuse/rate-limit controls. Check a real sign-in email and refresh flow before public use; local tests do not verify your email configuration.
5. Set these server environment variables and restart the app:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
APP_URL=https://your-app.example
```

For local development use `APP_URL=http://localhost:3000` and allow `http://localhost:3000/auth/callback`. Use the same hostname when browsing, requesting the link and opening it. `127.0.0.1` and `localhost` are different origins. Open the sign-in email in the same browser that requested it because the PKCE verifier is stored in a cookie.

All three values are optional as a group. With none set, the UI explains that saving is unavailable and example audits remain usable. Partial/invalid configuration returns a deployment error. The key is publishable by design but is kept server-side here; no database password is needed at runtime. Do not put credentials in commits.

## Data and access rules

- Name: 1–80 characters; description and audit focus: 1–1000 each.
- Goals and blockers: 1–8 items each, up to 240 characters per item.
- Limit: 50 personas per account, enforced in Postgres, including direct Data API writes.
- Owners may read/create/edit/delete only their rows. Ownership cannot be transferred through normal API permissions. Deleting an Auth account cascades its persona rows.
- Database RLS and verified-user API filters both enforce ownership. Only selected owned UUIDs are loaded during audits; client-supplied persona content/owner IDs are not accepted.
- Auth cookies are HttpOnly, SameSite=Lax and Secure on HTTPS. Session validation/refresh happens in route handlers, before a streamed audit response starts. Keep private responses uncached at any proxy/CDN.
- Persona content used in an AI-enabled audit is sent to the configured AI provider with the audit evidence. The editor explains this. Owners should define suitable privacy/retention terms for their deployment.
- Reports contain a snapshot of the selected personas. Editing/deleting a saved profile does not rewrite an existing report or a downloaded export. Signing out clears the current workspace report and rerun payload.

The account feature protects saved personas. It does **not** add global login requirements or per-user spending quotas to public example/site/page/compare audits. Follow `SECURITY.md` for public hosting controls.

## Verification

`npm test` covers field validation, custom/example ID selection, no-service defaults, request protections and custom persona prompt/report/export behavior. CI includes a separate PostgreSQL 17 service for database isolation tests; a new GitHub run still needs to pass after publishing.

To reproduce SQL tests in an **empty disposable** local PostgreSQL cluster/database with no existing `anon` or `authenticated` roles using your own connection parameters:

```sh
psql -v ON_ERROR_STOP=1 \
  -f tests/sql/bootstrap.sql \
  -f supabase/migrations/202610060001_personas.sql \
  -f tests/sql/personas-isolation.sql
```

The bootstrap only imitates the Auth users table, roles and UID function for testing RLS. It is not an authentication implementation. The SQL test rolls back its synthetic records. The application itself has no fake-login or test-bypass switch.

VERIFIED on 6 October 2026: the migration and SQL checks passed on an isolated local PostgreSQL 14.19 cluster. Browser create/reload/edit/delete, selection reset, sign-out and a heuristic example.com audit passed using that real database and a disposable local test double for Supabase Auth/Data API. No email was delivered. Hosted Supabase Auth, production email delivery and actual token refresh were not verified because no live project was connected.

Implementation references checked 6 October 2026: [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), [email sign-in](https://supabase.com/docs/guides/auth/auth-email-passwordless), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).
