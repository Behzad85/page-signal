# Public interface implementation plan

> Execute inline using the existing project state. Keep earlier public-release fixes and local-only backups.

**Goal:** Distinct public identity and a real migration from Mantine to Material UI.
**Architecture:** Shared MUI provider and field primitives; persistent responsive shell; existing workspaces retain their state and analysis contracts. Report styles share light tokens and semantic colours.
**Stack:** Next.js, React, Material UI, Emotion, Material UI icons, Tailwind layout utilities.
**Spec:** ../specs/2026-10-06-public-interface-design.md

- [x] Replace dependencies/provider/theme/PostCSS configuration; add shared MUI field, button, alert, dialog and file-input primitives.
- [x] Create responsive navigation and page-heading components; restructure the website, UX, feedback, and about screens.
- [x] Migrate icons, report palette, numeric meters, loading, tickets, export menus and PDF identity. Preserve data and callback contracts.
- [x] Run tests/lint/build; inspect desktop/mobile states and interactions, repair issues found.
- [x] Update recreation prompt/design-source/current docs; remove old mockups from public source; regenerate and inspect the publication snapshot and archive.
