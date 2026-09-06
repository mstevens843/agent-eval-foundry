# Package identity and evidence decisions — implementation 01

This assignment establishes the package/evidence boundary needed for production work. It does not establish task hardness, destination acceptance, or permission to run models. No subject-provider calls were made. The existing dirty worktree and historical trial artifacts were retained.

## What changed

The implementation now distinguishes the artifact, the observations about it, and the action being requested. One package-stage policy is used by ship reporting, production readiness, trial entry, campaign decisions, and external intake. Legacy diagnostic gates remain inspectable but do not independently grant a release or execution decision.

The primary APIs are in `src/packages/` and exported from `src/index.ts`:

- `buildPackageRecord`, `publishPackage`, `resolvePackage`: schema-checked versioned records, immutable content-addressed publication and byte-verified resolution.
- `decidePackage`, `assertPackageStage`: one stage policy with explicit blockers and not-applicable requirements.
- `packageSourceSeed`: conservative source-backed records for the existing kernels and native CAA service.
- `inspectTrialEvidence`: original observations alongside a separate current/historical identity assessment.
- `publishRegrade`: immutable linked evaluation of a scratch copy of an existing submission, with zero new agent attempts and no inherited capability label.
- `evaluateOutcome`: exact expected scenario/check accounting, independently of the provider's exit status.
- `loadGapLedger`: schema-checked program ownership and verification requirements.

## Identity and immutability

Package schema version 1 records public contract/workspace and private scenarios, verifier, collector, adapters, reference, controls, dependencies and policy separately. File descriptors contain normalized relative paths, SHA-256 of actual bytes, byte length and executable mode. Canonical JSON sorts object keys; array order remains significant. Binary files are not decoded for hashing. Duplicate/case-colliding paths, traversal, symbolic links, special files, malformed digests and schema mismatches are rejected.

Files live once under `STORE/blobs/<sha256>` and records under `STORE/records/<digest>.json`. Publication uses exclusive creation and detects contrary existing contents. Resolution rechecks record/component digests and every referenced blob. Decisions refresh retained contents at the action boundary; an already-loaded object is not permission to ignore subsequent disk corruption. This is a local content-addressed store, not a distributed transaction or an authenticated external signature service. The store and policy inputs are owned by the trusted host.

The source seed conservatively retains source, scripts, data and build configuration, including the authority/collector dependencies omitted by older narrow hashes. Source cache exclusions are explicit; retained public/submission trees include dependency directories as well as source files. The generic and native runtime images/toolchains are **unresolved** until the production owner pins and verifies them. A source recipe is not a runtime attestation.

The public manifest exposes public file descriptors only. Private component names/digests and the aggregate package digest do not enter it. Native CAA author metadata is retained privately, not exported as agent instructions.

## Policy truth table

| Claim | Required evidence | Does not require |
| --- | --- | --- |
| local-valid | Verified package, passing reference/positive-work/near-miss controls, reviewed contract, no unresolved material ambiguity or known unrepaired bypass | Model failures, spend approval, arbitrary axis breadth |
| trial-eligible | Local validity, complete public package, protected grading, executed integrity controls, bounded-solvability evidence, resolved runtime dependencies | A prior model failure or a matched-pair campaign |
| trial-authorized | Eligibility and approval bound to the same package, operation and exact profile; currently only a branded inert adapter may execute | An old `ready` flag or available credentials is never authority |
| hardness-observed | Eligible exact package plus a complete content-verified standard semantic failure adjudicated capability | The full six-run qualification matrix |
| release-eligible | Professional package, destination checks, three genuine failures for each of two exact profile identities, required zero-reward adversarial evidence | Calibration kernels or ambiguous historical zeroes cannot qualify |

Unspecified checks remain unknown. Host-evaluated check inputs are not read from subject-generated `ready`, `counts`, or audit self-reports. Positive legacy summaries cannot override a failed new check, and conflicting bypass/ambiguity summaries preserve the largest known unresolved count. Producing actual same-route assurance receipts is the next production assignment; supplying `true` manually is not that work.

Production readiness retains old smoke arithmetic in `legacySmokeDiagnostics`, not its current evidence fields. Current provider summaries derive from verified observations tied to the exact package/profile and an explicitly host-attested provider family. Missing profile/lab provenance is not inferred from a model name or an imported count. Effective provider-profile attestation remains Prompt 5's responsibility.

Real provider adapters and historical provider/reader execution entry points deny execution before model invocation. Newly prepared bundle scripts also stop before a provider command. Inert adapters have no process-launch callback and report their invocation count, allowing approval-denial tests to prove zero calls. Prompt 5 must implement durable reservations, exact effective settings and process budgets before real execution is enabled. Existing frozen historical scripts are evidence, not newly authorized jobs.

## Typed evidence and historical compatibility

Semantic pass/fail requires the exact expected scenario population, valid known failed-check IDs, no duplicate/missing/unexpected cells and finite valid accounting. Provider, artifact, collector, verifier and invalid-evidence outcomes remain separate. Host errors and error-shaped cells cannot be counted as implementation failures. A completed wrong implementation with complete observations remains a semantic failure. Crashes and timeouts never qualify, even when attributed to subject code. Authoring isolation and grading isolation are recorded separately.

Modern directory ingestion cross-checks the retained verifier output, evaluation envelope, result and countability. Full inspection also resolves the retained package and checks public/submission bytes against it. Legacy hashes retain their original visible-only scope: available saved bytes outrank metadata, mismatch is invalid and absent bytes remain unknown. Missing historical private/runtime identities are not fabricated.

Phase 14 reads its frozen package-lock/preregistration and retained Phase 13 calibration instead of assuming the current source is the old task. `data/package-history-lock.json` adopts hashes of existing legacy bytes at this implementation boundary; it is not a retroactive runtime attestation. Phase 13 exposes explicit current and historical views. Campaign reconciliation limits membership to that campaign and keeps historical records separate from current counts.

Packet validation is not grading: external intake preserves returned packets, requires the central eligibility policy before trusted grading, and does not convert an imported countability flag into current cross-lab evidence. Linked regrading creates a new evaluation, never a new agent attempt or a rewrite of the original trial.

The imported outbox observations remain scoped historical evidence. Six completed zero rewards survive, but current labels include five specification-ambiguity findings and one unresolved finding. They are not promoted to six fair capability failures. The existing dedicated outbox evidence regressions remain part of the verification tier.

## Inspection and native CAA seed

After a normal build, these commands do no provider work:

```sh
node dist/cli.js package gaps
node dist/cli.js package snapshot .local/package-store caa-revalidation-repair source-seed-v1
node dist/cli.js package inspect .local/package-store DIGEST_FROM_SNAPSHOT
node dist/cli.js package trial .local/package-store PATH_TO_TRIAL
node dist/cli.js package trial .local/package-store PATH_TO_TRIAL CURRENT_PACKAGE_DIGEST
```

Only `snapshot` publishes bytes. `inspect`, `trial`, `gaps` and `currentChallenge` are read-only; none regenerate historical reports, reissue a campaign or run a model. The inspection command is host-only because the record contains private descriptors. A native seed is an integration artifact for the next owner, **not a trial-ready CAA package**: normalized native scenario/check manifests, runtime pinning, executable assurance and final export remain required.

## Baseline and acceptance evidence

Baseline: HEAD `6d71a25` plus the preserved user worktree. Typecheck/lint/build passed. The initial selected 91 tests produced 84 passes and 7 failures: an environment-dependent provider fixture, an obsolete UI readiness expectation, three historical/current Phase 14 comparisons, and two shared-bank tests assuming old trials were still current.

Repairs retain the behavior those tests were meant to check: frozen variants are compared to frozen parents; historical cohorts are explicit; the no-credential fixture controls its own environment; a controlled complete bank proves the overlap threshold is reachable without fabricating current evidence. No historical trial, campaign, grading result or adjudication is rewritten to obtain a passing assertion.

Final verification and source identities are recorded in [the verification receipt](verification/prompt-01.json) and `.local/implementation-handoffs/01.json`. Required counterexamples are executable in `test/package-evidence-decisions.test.ts`: optimistic legacy SHIP flags, bypass/ambiguity blocks, stale disk bytes, missing/changed approval, duplicate/missing/error results, valid completed near misses, immutable historical resolution and linked regrades. Additional history/root-cause/intake/outbox tests cover affected consumers.

Final bounded tier: **329 passed, 3 failed at the intentionally closed unreserved-execution boundary, 2 explicitly unexecuted exhaustive sweeps**. The 126 required policy/history/intake/outbox checks are a passing subset of those 329, not additional independent tests. All 9 protected-authority regressions pass with Docker access. Typecheck, lint (408 files), the normal ESM/CJS/declaration build and `git diff --check` pass.

The bounded run completed in approximately 137 seconds. Before/after verification snapshots agree on digest `79c90726cdf7eebefd3a8630161ad13b89a1ace04725b2a90c67b95ddc5c529d` over 3,205 files / 57,511,612 bytes. Separately, all 873 checked historical evidence files match their pre-edit bytes. These are scoped results, not an assertion that the entire repository test suite passed.

This is not a claim of a globally green repository. Three legacy tests still ask the shell adapter to execute without the new reservation authority. They remain unsuppressed and assigned to Prompt 5 (`EXECUTION-TESTS-1`). Prompt 7 owns final whole-system integration.

The initial broader run exposed a sandbox prerequisite: Docker was reachable by the tool but not by the sandboxed test subprocess. A CAA reference check passed after rerunning with Docker access. The subsequent exhaustive run was deliberately interrupted after roughly ten minutes: two existing memory host-equivalence tests expand to 864 independent container launches each. They are not Prompt 1 policy tests. Their full-sweep result remains **incomplete**, not passed; no per-test skip was added to source. The bounded final command explicitly excludes those two names while retaining the dedicated protected-authority tests, the other host checks and all policy/history regressions. `G14`/`E4`, owner 7, must establish an affordable mandatory/exhaustive tier and complete that coverage without weakening isolation. The receipt records the exact filter and failure names.

Native CAA seed: `.local/prompt-01/package-store/records/2320c5e4b20ca33e6c4bd5b30be44056f4c4420bc0e59c6e278ed64deca40fa0.json`, version `prompt-01-source-seed-v1`. Its 776 distinct blobs occupy 18,188,313 bytes; the record is 189,108 bytes. One CLI inspection took approximately 156 ms and left the records directory unchanged. This is a single local observation, not a comparative performance benchmark. The seed can also be reproduced from the retained source using the public API/CLI; runtime and assurance blockers remain explicit.

## Handoff and remaining owners

`data/implementation-gap-ledger.json` is the authoritative ownership register, with each audited executable family, native CAA and the adjacent browser prototype represented. A passing ledger schema is an organizational check, not package assurance.

1. Prompt 2 consumes the native CAA seed and these APIs to build the first complete production/export path, pin runtime identity and collect real local assurance. It also owns the sampler/Jaccard and native capture gaps.
2. Prompt 3 completes the ten remaining protected routes and incomplete family APIs.
3. Prompt 4 builds coherent substantive packages and proves meaningful solution diversity.
4. Prompt 5 implements reserved execution, atomic trial persistence, bounded capture and effective profile attestation. No model spend is granted by this handoff.
5. Prompt 6 integrates trial inspection, findings/withdrawal and evidence-backed transfer/selection.
6. Prompt 7 closes the full test matrix, measured performance and public-documentation gaps.

The immediate next assignment is Prompt 2. The identity/policy/history interfaces are implemented; missing production evidence remains explicit instead of blocking development behind a claim that a weak kernel is already a finished task.
