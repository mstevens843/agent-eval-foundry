# Source releases

The developer workflow is versioned as **0.2.0** in `package.json` and [CHANGELOG.md](../CHANGELOG.md).
It is distributed as source with pinned dependencies. The npm package remains private.

## Prepare a reviewable release candidate

```sh
pnpm typecheck
pnpm lint
pnpm build
pnpm test:pure
pnpm replay:example
node scripts/verify-publication.mjs
pnpm test:onboarding .local/release-onboarding-1
pnpm release:prepare .local/release-0.2.0-1
```

The last command captures tracked and nonignored intended source, checks it for accidental
secret material, writes a file/hash manifest and produces a versioned source archive plus
SHA-256 checksum. It excludes `.git`, dependency caches, `dist`, `.local` and credentials.
It does not silently include ignored model archives or perform any model calls.

The archive is labeled **release candidate**. Its source digest identifies the exact content;
its base commit is not a claim that uncommitted work is already released. Validate the extracted
archive in a separate directory before distribution. `pnpm install --frozen-lockfile`,
`pnpm build`, `pnpm test:pure`, `pnpm replay:example` and the onboarding check are the recipient path.

## Publish a version

Review the exact candidate and concurrent changes first. Once the combined changes are
committed and required CI is green, tag the reviewed commit `v0.2.0` and attach the verified
source archive/checksum to its GitHub release. Do not point the tag at an earlier or partially
merged version. Preparing a candidate does not create a tag or publish a release.

The built-in template, frozen replay and walkthrough belong to the same source version.
The replay has an additional fixture version and checksum manifest. If its preserved code
or trace changes, create a new replay version and explain the provenance change.

## Independent handoff exercise

Give another engineer the release source and quickstart. Ask them to:

1. Install and reproduce the recorded checker defect.
2. Build and validate a package.
3. Change a task's contract, add a distinguishing control, and produce a valid export.
4. Validate that export from another directory using only its recipient README.

Record completion, questions, failures, platform and time spent. These observations provide
usability evidence; an automated walkthrough alone is not an independent human handoff.
