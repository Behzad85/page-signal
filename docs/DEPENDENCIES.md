# Dependency review

Checked 6 October 2026 against npm's advisory service, using the machine's system certificate store. This is a dated registry result, not a guarantee against undisclosed vulnerabilities.

The initial audit reported 16 affected packages: 1 critical, 12 high, 2 moderate, and 1 low. Preparation updated Next.js and eslint-config-next from 16.2.6 to 16.3.8, PostCSS to 8.5.29 with a shared override, and compatible transitive packages in the lockfile.

After those updates:

| Check | Result |
| --- | --- |
| `npm audit --omit=dev` | 0 reported production vulnerabilities |
| `npm audit` | 5 high alerts in one development dependency chain |

The remaining chain is `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. The registry reports [stack exhaustion in braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). The published `braces` version is 3.0.3; the current advisory includes it. These five alerts are related package entries, not five independently demonstrated application exploits.

The suggested forced fix downgrades `eslint-config-next` to 14.2.35, crossing two major framework generations. That was not applied. This toolchain processes local source/configuration during development and CI; it is not used as an application route. Review untrusted configuration changes and update when a compatible patch becomes available.

Recheck before publication and releases:

```sh
npm audit --omit=dev
npm audit
```

If the host requires operating-system trust roots, use a Node version supporting `NODE_USE_SYSTEM_CA=1`; do not disable HTTPS certificate verification. GitHub CI runs on its own trust store. The full audit currently exits nonzero for the documented development dependency chain; that result must not be represented as clean.

The 6 October 2026 Material UI migration was audited again after removing Mantine, Lucide and their unused theme plugins. The result remained 0 production vulnerabilities and the same 5 high development dependency entries. MUI, its Next.js integration, and icons are pinned to 9.4.0; Emotion packages are pinned in the manifest and lockfile.

After adding `@supabase/ssr` 0.12.7 and `@supabase/supabase-js` 2.117.2, a fresh registry audit on 6 October 2026 again reported 0 production vulnerabilities and the same 5 high development-chain entries.

The Magic UI migration on 6 October 2026 removed Material UI and Emotion. Magic UI/shadcn component source is checked into the repository; runtime additions are pinned: Motion 14.0.0, Radix UI 1.7.0, cn 0.4.0, class-variance-authority 0.7.1 and tw-animate-css 1.4.0. A fresh npm registry audit reported 0 production vulnerabilities and the same 5 high development-chain alerts. The installed tree contains no Material UI, Emotion or Lucide package. Upstream source notices are retained in `THIRD_PARTY_NOTICES.md`.
