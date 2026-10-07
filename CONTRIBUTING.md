# Contributing

Use Node.js 22, run `npm ci`, and copy `.env.example` to `.env.local`. Keys are optional. Run the application using `npm run dev`.

For a change, describe the concrete problem and expected behavior. Add a regression test when correcting a meaningful behavior or security boundary. Keep deterministic evidence separate from generated analysis, preserve missing-evidence states, and retain accessible keyboard interaction.

Run `npm run check:public`, `npm run lint`, `npm test`, and `npm run build` before submitting a pull request. Update `init.md` with every project change; update `design-source.json` for design or interaction changes. Do not change the existing icon or UI system as part of unrelated work.

Use synthetic or public examples in issues, screenshots, fixtures, and reports. Never submit provider credentials, signed asset links, private customer content, or unapproved persona material. Report vulnerabilities through the private route described in [SECURITY.md](SECURITY.md).

Before accepting external contributions or granting reuse rights, the owner must select and publish the repository's license. No open-source license is granted by these instructions.
