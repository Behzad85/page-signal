# Security and deployment boundaries

This project is an MVP for local evaluation and controlled deployments. Publishing its source does not make the current application suitable for unrestricted public hosting.

## Before operating a public service

- Put authentication and access policy in front of the application, including `/api/analyze` and `/api/feedback`.
- Enforce shared request, concurrency, body-size, and provider-spending limits at a trusted gateway or service layer. The analysis route has no account-level quotas. Its per-request crawl limit is not a billing boundary.
- If feedback is enabled, configure a new HTTPS delivery service/token and your own recipient. Its in-process IP limiter relies on proxy headers; a trusted proxy must overwrite them. It is not a distributed abuse control.
- Run Browserless in an isolated network that denies access to internal services, loopback-sensitive resources, private ranges, and cloud metadata at connection time, for all page requests, redirects, subresources, and protocols. Its in-page URL interception is not equivalent to `guardedFetch` and does not prevent DNS rebinding. Leave screenshot settings empty until that infrastructure boundary is in place.
- Keep API credentials server-side. Configure provider quotas and avoid exposing provider responses or private audit content in logs and public issues.

## Controls implemented in the application

Node HTTP/HTTPS fetches validate public targets and redirect destinations, validate DNS at connection time, and bound compressed/decompressed body sizes. IPv4-mapped IPv6 literals use the same IPv4 exclusion rules. These protections do not extend to a separately deployed browser service.

Feedback and analytics have no built-in recipient or tracking property. Missing feedback configuration fails before making an outbound request. CSV and copied-table exports neutralize leading spreadsheet formula markers. AI analysis is optional, and passive security findings come from deterministic observations rather than model-generated pass/fail claims.

These are specific controls, not a complete security certification. Spreadsheet software can reinterpret imported data; preserve the text treatment of exported cells. Dependency advisories and service configuration require continuing review.

## Reporting a vulnerability

If the published repository offers GitHub **Security → Report a vulnerability**, use that private channel. Otherwise contact the repository owner through a private contact route on their profile before disclosing exploit details. Do not put credentials or private customer data in public issues. The owner must enable private vulnerability reporting or publish a dedicated private contact before release.

Only the current development version is maintained; there is no promised response SLA or long-term support policy.

## Credential incident and release history

The pre-publication repository history contained a feedback-service credential and signed links in a scratch file. Removing them from the working tree does not revoke them or remove old commits. Revoke/replace the credential with the issuing service, remove any remaining access represented by the signed links as needed, and follow [PUBLIC_RELEASE.md](docs/PUBLIC_RELEASE.md) before making any history public. Never copy secret values into a report.

## Private saved personas

The optional Supabase integration verifies users in route handlers and uses owner-only Postgres RLS plus ownership filters. Use a publishable/anon key; service-role/secret keys are rejected. Persona writes require same-origin JSON, bounded fields and a verified account. Database constraints and a transaction-locked quota also apply to direct Data API writes. Never cache private API responses or cookie-bearing responses at the CDN.

Email sign-in requires provider-level rate limits, production email configuration and gateway abuse controls. Persona authentication does not add global authentication or provider-spend limits to `/api/analyze` or `/api/feedback`. Selected persona text is untrusted AI input; numeric evidence scoring remains independent. See `docs/PERSONAS_SETUP.md` for setup, data handling and actual test coverage.
