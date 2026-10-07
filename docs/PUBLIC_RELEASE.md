# Public release checklist

Preparation date: 6 October 2026. This is a local release candidate. The owner confirmed code publication rights; credential revocation remains unverified.

## Owner decisions required

- [x] USER_PROVIDED, 6 October 2026: the owner confirmed permission to publish the underlying application code.
- [x] At the owner’s request, remove former company-specific persona content and portraits. The public version uses original fictional examples, generic classifier rules, and new SVG avatars; former assets remain only in ignored local backups and private history.
- [x] USER_PROVIDED, 7 October 2026: personal repository selected — https://github.com/Behzad85/page-signal.
- [x] USER_PROVIDED, 7 October 2026: publish through Behzad85, with the Behzad85 username and GitHub noreply commit identity. Preserve accurate attribution to collaborators and AI assistance; do not imply independent ownership merely by changing the remote.
- [ ] Select a license only after rights are confirmed. Public visibility alone does not grant an open-source license.
- [ ] Revoke the previously committed feedback-service token and generate a new deployment secret. Treat its old value as exposed even if the original repository was private.
- [ ] Enable GitHub secret scanning/push protection where available and private vulnerability reporting, or provide a real private security contact.

## Preserve private history; publish a reviewed snapshot

The original history contains the credential and signed asset links. A normal clone/fork or push would copy those commits. The local history also contains an organisational author email. Deleting current files or adding ignore rules does not remove any of that history.

The recommended path is a new, reviewed source snapshot in a new personal repository. Keep the original private repository intact for provenance and any authorised private evidence. Do not backdate commits or represent the public snapshot as a historical activity record.

```sh
npm run check:public
npm run lint
npm test
npm run build
npm run export:public
```

The export writes `output/public-release/`, excludes ignored/local assistant files, contains no `.git` directory, checks selected secret patterns, and refuses to overwrite an existing export. Review **every** exported file and asset before initializing a new repository there. If you change anything, move the old export aside and regenerate it.

`check:public` requires the root of a Git repository; an exported folder must first be initialized as its own new repository before that command can inventory it.

After the owner decisions above, initialize that directory as a **new** repository, configure your chosen public commit identity, commit the snapshot, and connect the personal GitHub remote. Do not use `git push --mirror` or copy `.git` from this project. The export does not publish anything and cannot verify ownership, a license decision, or token revocation.

If retaining full public history is essential, perform a separately reviewed history-cleaning migration with a backup, inspect all branches/tags and historical objects, and coordinate with existing collaborators. Do not rewrite the shared original casually.

## Public interface

The public version is branded PageSignal and uses Magic UI with shadcn/Radix controls, a cool light palette, workspace navigation, and local Material SVG icons. Prior mockups and design history are held only in ignored local backups and original private Git history. The owner’s independent-side-project account is attributed in the case study. Publish only the latest regenerated snapshot; earlier source ZIPs retain the superseded appearance.

## Validation and presentation

- [x] Dependency advisory checks completed using the system certificate store. See `docs/DEPENDENCIES.md` for the remaining development-only advisory.
- [ ] Confirm CI passes on the new repository without provider secrets.
- [ ] Capture screenshots using public/synthetic audit data, with no private URLs, keys, or customer feedback visible.
- [x] Review the README, engineering case study, product scope and known limitations for accuracy; distinguish inherited notes from current checks. See `RELEASE_VALIDATION.md`.
- [ ] Add genuine usage and impact evidence separately; describe what you personally contributed and retain dated supporting records.
- [ ] Review `SECURITY.md` before enabling a hosted demo. Source publication and public operation have different requirements.

## Local-only material

The unrelated tracked scratch HTML was moved to ignored `.local-only/temp.html` so its content remains available locally. Existing duplicate files and `temp.md` are ignored rather than deleted. `.env.local` remains local. These files must not be manually added to the public snapshot.

## Publication authorization

On 7 October 2026 the owner explicitly requested publication through Behzad85. GitHub CLI verified the active account and administrator access to the initially empty destination. Publish only a fresh snapshot commit; retain the private repository separately. The application has no selected open-source license.
