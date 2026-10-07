# Validation history

The initial publication-preparation checks below predate the Material UI redesign. Current verification is recorded in design-source.json and the latest dated section below.

# Public source preparation: validation record

Checked 6 October 2026. These results describe local source preparation; nothing was pushed, published, or deployed.

| Check | Observed result and source |
| --- | --- |
| Clean installation | `npm ci` succeeded in the exported source directory without the original `.env.local` |
| Automated tests | `npm test`: 60 passed, 0 failed, including spreadsheet formula/quote regression cases and mapped IPv6 destination checks |
| Lint | `npm run lint` passed |
| Production build | `npm run build` passed in the clean export with optional service credentials absent |
| Local production startup | `npm start` served the standalone build without the previous standalone-start warning |
| Route checks | HTTP 200 for `/`, `/about`, `/feedback`, and `/ux-audit` |
| Default integrations | Unconfigured feedback POST returned 503; page HTML contained no Google Analytics loader |
| Browser checks | Generic persona artwork and fictional-example labels rendered; primary-persona selection updated the UX form; console had no warnings or errors |
| Production dependencies | npm advisory service reported 0 production vulnerabilities |
| Development dependencies | npm advisory service reported 5 high package alerts in one chain; see `DEPENDENCIES.md` |
| Public-file patterns | `npm run check:public` found no selected secret patterns in the current exportable files |
| History inspection | Local redacted scan examined 43 commits and 249 unique blobs; credential/signed-link patterns matched two blobs. Original history is deliberately excluded from the export |
| Code publication rights | USER_PROVIDED: owner confirmed permission to publish the application code; former company persona material was replaced at their request |

A quoted-field spreadsheet regression was added after the browser check; the subsequent production build passed. A final tooling regression verifies that the publication scanner refuses a nested uninitialized export instead of claiming an empty scan is clean. Neither change alters the inspected page layout.

No paid-provider integration, live email delivery, unrestricted hosted deployment, Docker runtime, or new GitHub CI run was exercised. Full live audit flows were not repeated during this preparation. Browser checks covered the empty/local workspaces and persona interaction, not every generated report state.

The security review covered selected source surfaces and has partial semantic coverage. It identified deployment requirements for analysis access/quotas, screenshot-worker network isolation, and trusted proxy handling for enabled feedback; these are documented in `SECURITY.md`. This is not a comprehensive security certification.

Earlier implementation notes and superseded visual mockups are preserved only in ignored local backups and private Git history; current `init.md` and design-source metadata describe the public edition. Private test targets are omitted; public example domains are not substituted as claimed evidence of prior tests.

Before publication, the owner still needs to revoke the old feedback credential, choose the repository/public identity and reuse terms, and complete the applicable items in `PUBLIC_RELEASE.md`. The local snapshot has no Git history; do not copy the original `.git` directory into it.


## PageSignal Material UI redesign — 6 October 2026

VERIFIED against the local commands and in-app browser checks listed below on 6 October 2026. This section supersedes the earlier interface results above.

| Check | Observed result and source |
| --- | --- |
| Clean public snapshot | Fresh `npm ci --no-audit --no-fund` installed 411 packages outside the original workspace; the clean copy passed the Webpack production build and all 62 tests without `.env.local` |
| UI dependency migration | Package manifest and installed dependency tree use Material UI 9.4.0, Emotion, and Material UI icons; Mantine, Lucide and the old theme plugins are removed |
| Automated tests | `npm test`: 62 passed, 0 failed. Two new cases cover manual feedback drafts surviving persistence and retiring stale classification values |
| Lint and source patterns | `npm run lint` passed; `npm run check:public` examined 97 exportable files with 0 selected-pattern findings |
| Production build | `npm run build -- --webpack` passed with optional service configuration blank. The default Turbopack attempt was blocked by a local helper-port permission restriction; it is not recorded as a successful default-builder check |
| Production browser | All four routes rendered at localhost with the new theme and correct titles; the fresh production tab reported 0 console warnings/errors |
| Desktop/mobile | Inspected at 1280×720 and 390×844. Observed document widths of 1265 and 375 pixels respectively (scrollbar space excluded), with no horizontal document overflow on the inspected forms. Navigation restores the page heading and closes the mobile drawer |
| Analysis interaction | Site/page/compare forms change correctly. A live heuristic scan of example.com completed with a real report; report tabs, ticket rows, export menu and copy-table success were exercised. Optional paid integrations remained disabled |
| UX selection | Changing the primary persona and enabling a comparison updates selection state; the primary cannot also be its own comparison |
| Feedback interaction | Added one synthetic test record, reproduced and repaired draft edits being discarded, verified correction after reload, marked reviewed, filtered it, then removed only that test record |
| Dialog | Feedback dialog has a labelled title and fields; Escape closes it and returns focus to the feedback trigger. No message was sent |
| Dependency advisories | npm advisory service still reports 0 production vulnerabilities and 5 high development dependency entries in the documented braces chain |
| Design inventory | JSON parses; 24 code component entries and 4 page frames. Figma writes, components, component sets, instances and Auto Layout counts are all 0 because no Figma source exists |

The written design reference was used because no built-in image-generation tool was available. Actual browser screenshots were inspected; no pixel-match claim is made. The following choices distinguish the public presentation from the superseded mockups:

| Written design choice | Implementation inspected |
| --- | --- |
| Warm light canvas and rust accent | Cream workspace, white form surfaces, orange primary actions and muted semantic colours |
| Editorial typography | Serif page headings paired with system sans-serif controls; no external font fetch |
| Persistent workspace navigation | Desktop left rail; compact mobile top bar and labelled drawer |
| Open analysis entry | Full-width underline mode tabs and URL controls, followed by an open three-step explanation |
| Evidence presentation | Numeric scores and horizontal meters; light report tables/tickets; MUI underline report tabs |
| Generic persona identity | Original neutral monogram SVGs and explicitly fictional examples |

Browser testing exposed and fixed a head hydration error when analytics was disabled, a native-select rendering problem, report-tab hover contrast, route scroll positioning, and the pre-existing feedback draft-persistence bug. The final production tab has no observed hydration errors. A read-only follow-up review found no further actionable issue in draft persistence; that review is not a substitute for the recorded tests.

Paid-provider report variants, screenshot capture, final manual PDF/CSV download appearance, email delivery, Docker runtime, new GitHub CI and public hosting remain untested in this redesign. Source publication is still pending the personal repository, credential revocation and owner release choices; no push or deployment occurred.

The final source export contains 96 files and excludes Git history, private environment files, dependencies, build output, local assistant settings, superseded mockups and local backups. The 97-file source check also inventories one local assistant file that the export deliberately omits. ZIP contents are compared byte-for-byte with the source snapshot and accompanied by a SHA-256 file.


## Private Postgres personas — 6 October 2026

VERIFIED against the local commands, PostgreSQL results and in-app browser checks listed below on 6 October 2026. These checks cover the saved-persona addition; earlier redesign results retain their original scope.

| Check | Observed result and source |
| --- | --- |
| Automated tests | `npm test`: 70 passed, 0 failed; includes bounded persona inputs, optional/safe configuration, same-origin request limits, owned selection resolution and custom persona report/prompt/export contracts |
| Lint | `npm run lint` passed |
| Production build | `npm run build -- --webpack` passed with optional service configuration blank |
| Database | Fresh isolated PostgreSQL 14.19 cluster passed the test-only auth bootstrap, migration and SQL suite: owner CRUD, cross-owner read/update/delete isolation, anonymous denial, ownership immutability, invalid data rejection and 50-persona cap; test data rolled back and cluster stopped |
| CI configuration | Added a separate PostgreSQL 17 service job to run bootstrap, migration and SQL tests. The GitHub-hosted job itself has not run |
| Browser persistence | With real local Postgres and a disposable Auth/Data API test double: created a synthetic persona, reloaded to confirm persistence, edited it, selected it for a live heuristic example.com audit, then deleted only that test persona |
| Selection/report state | Custom persona appeared in the generated report; two comparisons disabled a third. Deleting the primary restored Lucy without duplicating her as a comparison; sign-out cleared the current report and private library |
| Responsive dialogs | Editor inspected at 390×844, with visible labels and no horizontal document overflow; Escape closed it and restored focus |
| Request boundaries | Test-preview HTTP checks returned 403 for a foreign origin, 401 for unsigned persona creation and unsigned custom-persona analysis, and 413 for an oversized request |
| Production preview | Final unconfigured `/ux-audit` shows the database-unavailable message while preserving examples; all three built-ins display Example. Browser reported 0 warnings/errors |
| Dependencies | Registry audit: 0 production vulnerabilities; same 5 high development-chain alerts documented in `DEPENDENCIES.md` |
| Source patterns | `npm run check:public`: 114 files, 0 selected-pattern findings. This is not a complete secret/history audit |
| Design inventory | Valid JSON with 28 code component entries, 4 page frames, and 0 Figma writes/components/component sets/instances/Auto Layout containers |

The local Auth/Data API test double is outside the repository and never included in the public export. It exercised application requests against real Postgres but did not validate hosted Supabase email delivery, PKCE verification or token refresh. Those live checks remain a deployment requirement in `PERSONAS_SETUP.md`. The local test preview and provider were stopped. No paid service, real email, push or deployment was performed.

The refreshed public snapshot contains 113 files and excludes original Git history and private configuration. Its source-pattern inventory includes one additional local assistant file that the exporter deliberately omits.

A fresh copy of the 113-file export installed 421 packages with `npm ci --no-audit --no-fund`, passed all 70 tests, and passed the Webpack production build without private environment files. After these checks, only the dated validation/setup wording, plan checkboxes, recreation prompt and design metadata were updated; application source and dependencies are unchanged. The final ZIP is compared byte-for-byte against the source snapshot and accompanied by a SHA-256 file.


## Magic UI migration — 6 October 2026

VERIFIED against the local commands and in-app browser checks listed below on 6 October 2026. This section supersedes the earlier Material UI interface results; database and security checks above retain their stated scope.

| Check | Observed result and source |
| --- | --- |
| UI source and dependencies | Official Magic UI Shimmer Button, Number Ticker, Border Beam and Dot Pattern sources, with shadcn/Radix form, dialog, tab and menu controls. Material UI, Emotion and Lucide packages are absent from the installed dependency tree. 61 local Material SVG icons retain upstream notices |
| Automated checks | `npm run lint` passed; `npm test`: 70 passed, 0 failed; `npm run build -- --webpack` passed with optional services blank |
| Desktop/mobile | Inspected at 1280×800 and 390×844, with no horizontal overflow on inspected forms and persona editor. Production mobile drawer measured x=0, y=0, width=300, height=844; feedback dialog x=20, width=350 |
| Saved personas | With real disposable Postgres and an Auth/Data API test double: email-link UI, create, reload persistence, edit, use in live heuristic example.com audit, delete the synthetic persona and sign out. Custom needs appeared in the report; deletion restored the example selection and sign-out cleared private state |
| Controls and feedback | Site/page/compare fields, keyboard report tabs and export menu, synthetic feedback entry/reload/review/removal, generated dialog title associations, Escape and opener focus restoration checked. No real feedback message was sent |
| Final production preview | Correct public identity, optional-database-unavailable state and three Example labels; browser console reported 0 warnings/errors |
| Dependency advisories | npm advisory service: 0 production vulnerabilities; 5 high development-chain entries remain documented in `DEPENDENCIES.md` |
| Design inventory | JSON parses; 32 code component entries, 4 page frames, 61 local Material icons. Figma writes/components/component sets/instances/Auto Layout counts remain 0 |
| Public source patterns | 140 files inspected with 0 selected-pattern findings; one local assistant file is deliberately omitted from the 139-file publication export. This does not constitute a complete history/secret audit |

Actual in-app browser screenshots were inspected against the written specification. No generated image reference was available, so no pixel-match claim is made.

| Written design choice | Observed implementation |
| --- | --- |
| Cool light canvas and indigo accent | Light workspace, white panels, indigo actions and pale selected navigation |
| Sans-serif hierarchy and restrained layout | Bold system-sans headings, 224px desktop rail and compact mobile header |
| Labelled, accessible controls | Persistent labels, Radix dialog titles/focus handling and keyboard tabs/menus |
| Purposeful Magic UI accents | Shimmer primary actions, measured-score ticker, active-scan beam and static heading dots |
| Neutral public identity | Original monogram personas and 61 retained Material vector icons; no former company portraits |
| Responsive forms | Scrollable mobile persona editor, full-height navigation drawer and centered feedback dialog |

Production testing found that CSS optimization merged a drawer transform/translate reset and shifted the panel off-screen. The panel now uses an explicit left placement variant rather than centered Tailwind translation classes; the rebuilt production geometry was verified. Other migration fixes covered JSX test-loader compatibility, generated dialog title associations and busy-button semantics.

Motion preference guards and reduced-motion CSS were inspected; a forced reduced-motion browser session was not performed. Hosted Supabase email delivery, PKCE/refresh, paid integrations, final manual PDF/CSV download appearance, Docker runtime, GitHub CI and public hosting remain unverified. No push or deployment occurred.

A fresh copy of the 139-file source export installed 453 packages with `npm ci --no-audit --no-fund`, passed all 70 tests and passed the Webpack production build without private configuration. Only validation metadata, plan completion, attribution wording and this recreation record were subsequently updated. The final ZIP contains the same 139 source files, verified byte-for-byte against the export and accompanied by a SHA-256 digest.


## GitHub header link — 7 October 2026

VERIFIED against the GitHub repository API, local commands and in-app browser on 7 October 2026: the selected repository is `Behzad85/page-signal`, public and empty at the time of checking, with 0 stars. The shared header now includes its official GitHub icon, repository link and public star count.

- Lint and all 70 tests passed; the Webpack production build passed with optional services blank.
- Browser showed the loading state followed by the real `0 stars` response. Clicking opened the exact repository in a new tab. The original application stayed open.
- Desktop and mobile 390×844 layouts were inspected. At 320×740, a pre-existing intrinsic grid width expanded the website form; an explicit single minmax column fixed it. Final document scroll/client widths both measured 305px (scrollbar space excluded). Analysis tabs scroll internally and switching to Page analysis updates the fields.
- The final browser console reported 0 warnings/errors. No blank page or framework error overlay was observed.
- Five-minute visible-tab polling, eight-second timeout, safe-integer validation, unavailable state and unmount cleanup were reviewed in source. Network failure, rate limiting and a full five-minute interval were not simulated in the browser.
- `init.md` and `design-source.json` updated: 33 code component entries and 4 page frames; Figma counts remain 0. The GitHub Octicons MIT notice ships with the source.
- Public pattern check: 142 files, 0 selected-pattern findings. The regenerated export and ZIP contain 141 source files, with byte equality and SHA-256 verification. Dependencies are unchanged from the previously clean-installed Magic UI version.

The GitHub account available to the local CLI had read-only access to the selected repository. Publication remains pending write access; no push, remote change or deployment was performed. The original private Git history is excluded from the source export.


## Public source publication — 7 October 2026

VERIFIED using GitHub CLI identity/permission checks and the successful Git push: the active account was Behzad85 (ID 4369000), with administrator access to the initially empty public destination. A fresh root commit `dabc8c2e87d43cacbba348fd992a07668823098d` published all 141 reviewed source files on `main`, using the Behzad85 GitHub noreply identity. The publication repository shares no Git object store with the original private repository.

Before publication, the working source passed lint and all 70 tests; its pattern check inspected 142 files with zero findings. The isolated 141-file publication checkout independently installed 453 packages and passed the Webpack production build without private environment files. Every exported source file was compared against the current workspace. No application code changed during publication.

Follow the [GitHub Actions runs](https://github.com/Behzad85/page-signal/actions) for hosted application and PostgreSQL 17 checks. Earlier statements about missing write access and no push describe prior phases and are superseded by this publication record. This is a source release, not a hosted application deployment.
