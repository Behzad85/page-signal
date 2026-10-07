# Third-party source notices

The source components below were installed from official registries on 6 October 2026. They retain their upstream licenses. This does not select a license for the owner's application code.

- **Magic UI** — Shimmer Button, Number Ticker, Border Beam and Dot Pattern in `components/ui/`; installed through the `@magicui` registry at https://magicui.design/r/{name}.json. MIT license: `docs/licenses/magic-ui.txt`. Shimmer Button credits @jh3yy for inspiration. Adaptations: JavaScript/relative imports, semantic colors, static SVG tiling for Dot Pattern, reduced-motion guards, stable/accessible numeric values, and hidden decorative layers.
- **shadcn/ui** — Button, input, textarea, label, dialog, tabs, alert, badge, avatar, dropdown menu, separator and field source in `components/ui/`; installed with the Radix `new-york` registry. MIT license: `docs/licenses/shadcn-ui.txt`. Adaptations: relative imports, `.js` extensions, local Material icons and an explicit left-placement dialog variant.
- **Material icons** — 61 vector icons in `components/design/icons.js`, retained from `@mui/icons-material` 9.4.0. The MUI package notice is in `docs/licenses/material-icons.txt`; the underlying Google Material icon vectors use Apache-2.0, included in `docs/licenses/google-material-icons.txt`. React wrappers are local; Material UI and Emotion are not runtime dependencies.

Runtime packages including React, Next.js, Radix UI, Motion, Supabase and Tailwind retain their own licenses, distributed with those packages.

- **GitHub Octicons** — `mark-github-16` vector in `components/design/GitHubStars.js`, sourced from https://github.com/primer/octicons on 7 October 2026. MIT license: `docs/licenses/octicons.txt`. Used only to identify the repository link.
