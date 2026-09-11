# Contributing to Agent Eval Foundry

Use [the quickstart](docs/quickstart.md) to run the system and [the authoring guide](docs/task-authoring.md)
to create a task outside the maintained registry. Bug reports, clearer documentation,
new valid alternatives and narrowly reproducible grader defects are useful contributions.

## Report a problem

Include the Foundry commit/version, Node and Docker platform, exact command, expected
behavior, actual behavior and a small reproducible input. For grading problems include
the public rule, relevant scenario/control and sanitized receipt details. Keep credentials,
private model transcripts and unrelated workspaces out of issues and pull requests.

## Develop and check

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm test:pure
pnpm replay:example
node scripts/verify-publication.mjs
```

For authoring, CLI, assembly or export changes, prepare the Docker image in the quickstart,
then run `pnpm test:onboarding .local/onboarding-contribution-1`. For grading, execution or
package behavior changes, run the relevant [verification tiers](docs/testing.md) and package
validation. Maintained CI performs the broader runtime checks. Report what you ran and any
unverified platform/runtime dependencies honestly.

## Propose a task

1. State its engineering problem and complete public contract, including bounded input sizes.
2. Include a runnable starter, independent grader, correct reference and a valid alternative.
3. Include narrow negative controls, ordinary public tests and explicit isolation checks.
4. Show a fresh successful assurance receipt and recipient reproduction.
5. Explain the distinct failure mechanism and overlap with existing tasks.
6. If you measured agent attempts, preserve package identity, provider/settings, exclusions,
   original outcomes and grading corrections. An unmeasured contribution should say so.

A validated custom task does not automatically enter the 25-task portfolio or qualify for
headline results. Maintainers review it before registration and destination-specific work.
Do not invent human review, model identity observations or trial evidence.

## Preserve evidence and concurrent work

Treat existing trial records as immutable. Record corrections and new versions separately.
Use new output directories and isolated snapshots for expensive checks while others work.
Keep patches focused and avoid formatting unrelated task/grader files. Include a concise PR
description explaining the behavior change, validation and remaining limitations.

Project-authored software is under [MIT](LICENSE). Third-party dependencies, imported corpora,
source snapshots and external materials retain their applicable notices and terms.
