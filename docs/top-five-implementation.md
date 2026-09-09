# Five implementation successors: development and qualification

The maintained sources are `tasks/variant-cache-repair`, `tasks/incremental-build-repair`,
`tasks/issued-report-repair`, `tasks/diagnostic-transport-repair`, and
`tasks/causal-replica-repair`. Earlier `.local/post-program` source copies are historical
inputs, not the next dispatch source. See the [implementation record](../reports/screening/top-five-implementation-plan-2026-09-09.md)
and [executed evidence](../reports/screening/evidence/2026-09-09-top-five-implementation.json).

## What changed

All five now ask for a service implementation and an independent release validator.
Their public starter is one empty `subject.run` entry point; complete implementations
and checker solutions live under `private/reference`. A separate correct service
implementation remains under `private/alternative`. Public regression tests exercise
ordinary behavior and intentionally fail on the skeleton. They do not prescribe
internal module layout.

The instructions retain product requirements, custom semantics, data provenance and
output schemas. They omit worked failure explanations, repair recipes and repeated
examples identifying the previous solver's mistake. Checker reasons are optional
free text: the graded deliverable is a complete, deterministic Boolean classification
of every supplied candidate. Missing verdicts are not counted as correct rejections.
Submitted helper modules are available to the checker.

The latest local controls have been integrated: cache preservation throughout an event,
compiler-handle availability at publication time, report dependency ordering, and
transport output completeness. Causal reconciliation keeps observation history even
when no live siblings remain and accepts valid implementations that avoid redundant
writes. These are consequences of retained requirements, not private new rules.

New Foundry snapshots use `professional-v3`; the five checker-required manifests opt
into diagnostic-only reasons. Older frozen snapshots and trial results retain their
original identities and scoring contracts. Public tests are optional. When supplied,
they must accept the correct implementations; the broken starter need not pass them.
A separately measured human solve is optional evidence, and self-verifiability alone
is no longer an automatic rejection. Contract validity and actual oracle correctness
remain required. The policy ambiguity count concerns competing legitimate
interpretations with different scores; omitted expert knowledge and unenumerated
consequences of a clear requirement are not unresolved ambiguities.

## Routine iteration

Use a fresh output directory and only the affected task IDs. The retained runtime
argument accepts a prepared-runtime directory or its `runtime.json` file.

```sh
pnpm build
node scripts/verify-selected-portfolio.mjs .local/cache-check-NEW .local/post-program/fifth-five/2026-09-08-build/source/.local/prepared-runtime variant-cache-repair
```

This builds the selected snapshot, executes its positive and negative service controls,
checks any public tests against correct implementations, and executes the complete
reference checker. It does not rebuild the other 24 tasks, repeat export reproduction,
install verifier tooling, or call a model.

Add `--release` when preparing a frozen dispatch/export. That additionally checks a
second build's identity, exports the package, and reproduces validation from the
export's own CLI in a foreign working directory. The recipient also verifies that
changed artifacts/evidence are rejected and crashes remain invalid executions. Keep
source files frozen for this step: an edit during validation must cause a drift failure.
Shared runtime/policy changes warrant broader tests; task wording changes do not warrant
revalidating unrelated cohorts.

## Native Harbor route

```sh
node scripts/build-harbor-portfolio.mjs .local/harbor-next-NEW variant-cache-repair
bash scripts/run-tb-checks.sh .local/harbor-next-NEW/variant-cache-repair .local/static-next-NEW
harbor run --path .local/harbor-next-NEW --agent oracle --jobs-dir .local/harbor-jobs --job-name oracle-NEW
harbor run --path .local/harbor-next-NEW --agent nop --jobs-dir .local/harbor-jobs --job-name nop-NEW
node scripts/verify-harbor-integrity.mjs .local/integrity-next-NEW .local/harbor-next-NEW/variant-cache-repair
```

Omit the task ID from the exporter to export the five selected successors. The exporter
refuses existing task destinations and records source/export file hashes. Solver and
verifier images use Node 24.18.1 with dependencies already installed. Solver containers
have ordinary root access and internet connectivity; private verifier code and oracle
solutions are never included in the solver image. The submission is small, and its
workspace is transferred to support implementations with local helper files.

The verifier runs submitted code as UID 1000 through isolated processes. It derives
service correctness from collected effects and checker correctness from actual traces
of known good and bad implementations. Tokens are opaque and candidate order is
shuffled. Private grading data stays inside the container until submitted processes
are stopped; trusted output publication replaces forged files without following
symlinks. Calibration/integrity failures are infrastructure errors, not scoreable
solver zeroes. Per-check results are exported in `ctrf.json`, with separate service,
checker and control details in `summary.json` and retained checker cases.

The integrity command checks missing verdicts, blanket acceptance/rejection, mutation,
private reads/writes, arbitrary diagnostic text, helper imports and forged output.
These are local author controls, not the two official model-driven cheat trials.

Static checks use the vendored upstream revision and hashes in
`scripts/tb-upstream-checks/upstream.json`. They run with installed Python 3.11+, bash
and jq; they do not start a container and run apt for every invocation. Updating the
checks is an explicit, pinned operation with `scripts/sync-tb-checks.mjs`.

## Final submission requirements

Engineering readiness permits exploratory trials. It is not a claim of measured
hardness or complete Klavis qualification. The final selected task still needs the
required model/rubric reviews, six qualifying standard failures, two zero-reward cheat
trials, and genuine human-authored reviewer material. Trial failures must be substantive;
calibration bugs, arbitrary labels and infrastructure failures do not establish hardness.

Do not require five human README writeups before exploratory trials: Klavis asks for
one final task. For the chosen submission, place the author's text in
`tasks/TASK/HUMAN-README.md`; the exporter copies it verbatim. A missing file produces a
clearly marked placeholder, never invented professional experience. The four required
sections are Difficulty explanation, Solution explanation, Verification explanation,
and Relevant experience, each one to three human-written sentences. Human authorship
of the final instruction is also a rubric concern; the current instructions are edited
development drafts. Review/update the final wording before qualification, and bind
subsequent trials to that actual final version.

[CONTRIBUTING](https://github.com/harbor-framework/terminal-bench/blob/83c7a6172d629c6575b785ab12c8db787bb2e323/CONTRIBUTING.md)
requires the human README sections. Its README guidance and static checks supersede
the older optional-README wording still present in the implementation rubric. Passing
static checks only establishes machine-checkable structure; it does not establish
human authorship or substantive rubric approval.
