# PageSignal public interface

User request: replace the interface library and visual identity so the public side project does not reproduce the internal tool. USER_PROVIDED, 6 October 2026: the owner built the code independently, from scratch, as a side project, without an employer instruction. This records the owner's statement, not independently verified authorship or legal advice.

## Direction

Use Material UI and Material UI outlined icons. The working identity is PageSignal. Light editorial workspace: canvas #f6f5f1, white surfaces, ink #222b36, muted #626b75, divider #dedfdc, accent #b94a2b. No gradients, glow, dark dashboard chrome, robot logo, or old mockups. Interface typography is system sans-serif; large page titles use a system serif stack. No external font download. Use an ordinary text wordmark and MUI icon, not a raster brand asset.

Desktop shell: a persistent 224px left rail with the wordmark, four destinations (Website analysis, UX review, Feedback, About), and a brief evidence-first product description. Main content has a small workspace breadcrumb, an open serif title, and restrained explanatory copy. At widths below 900px the rail becomes a compact top bar with a labelled menu drawer.

Website analysis: title “Find the next useful improvement.” A large white form presents Site analysis / Page analysis / Compare sites as underline tabs, followed by mode-dependent URL fields and crawl scope or keywords. Place the main analysis action alongside a quieter demo action. Replace decorative benefit cards and the empty dashboard gauge with an open three-step explanation: Collect evidence, Review findings, Make a change. Preserve mode API values, validation, stream progress, cancellation and results.

UX review: title “See the page through another lens.” URL and actions come first, with three persona rows/cards beneath in one full-width section. Use fictional personas with neutral monogram artwork. Preserve primary/comparison semantics and the six report tabs.

Feedback: title “Make sense of what people say.” Actions sit in a separate toolbar below the title. Preserve local persistence, CSV import, filters, manual entry, review corrections and the persona disclosure. Empty and populated states use the same light palette.

Reports: white evidence sections, dark text, thin rules, restrained semantic colours. Replace circular score gauges with numeric scores and horizontal meters. Restyle navigation, tables, tickets, warnings, progress, dialogs and export menus. Rebrand visible PDF titles and file names. No fabricated report data or impact metrics.

## Implementation boundaries

Retain Next.js and existing analysis logic. A small shared component module wraps actual Material UI controls to preserve the application's field callbacks. Remove Mantine, its PostCSS plugins, its theme, and Lucide dependencies. Use MUI App Router cache integration with explicit CSS layer order. Provider configuration stays optional and disabled by default. Do not deploy, push, or change remotes.

No Figma URL exists (user confirmed). Keep design-source.json as the code-side design contract, with null Figma node IDs and zero generated Figma counts. The image-generation tool is unavailable; implement against this written design specification and validate actual browser screenshots. Do not use paid image APIs without explicit authorization.

## Validation

Run lint, the existing functional tests, a production build, and dated production dependency audit. Inspect desktop and mobile screens in the in-app browser; exercise modes, a live heuristic report if network access permits, report tabs/exports, persona selection, feedback entry/filter/review, and feedback dialog focus/close. Check overflow, text contrast, keyboard state, and console errors. Remove old look-and-feel mockups from the public source, refresh init.md and documentation, and regenerate the clean source snapshot and ZIP without Git history or private files.
