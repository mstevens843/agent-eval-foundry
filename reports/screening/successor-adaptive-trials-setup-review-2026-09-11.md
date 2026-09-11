# Five successor trial campaigns: setup review, 2026-09-11

The successor implementation and checker hardening are merged into main: implementation commit `23aad5a`, merge commit `4a78cf2`. The other agent's seven setup files and all 30 prepared conditional slots were present in the canonical repository. No model trials were dispatched during this review.

Use the [reviewed controller handoff](../../docs/successor-adaptive-trials-handoff.md). The original controller remains unchanged as part of the [original preparation](evidence/2026-09-11-successor-adaptive-trials-preparation.json). A separate [review seal](evidence/2026-09-11-successor-adaptive-trials-review.json) pins the reviewed controller, scheduler, tests, frozen bundles and dependency tree. Task artifacts, grading code, profiles, original READY files and original preparation evidence were preserved.

## Campaign policy

| Package | Audited version | Conditional slots |
| --- | --- | --- |
| capacity-maintenance-repair | 2.0.1 | Claude 1–3, Codex 4–6 |
| partial-release-repair | 2.0.1 | Claude 1–3, Codex 4–6 |
| verified-installation-repair | 2.0.1 | Claude 1–3, Codex 4–6 |
| compatible-rollout-repair | 3.0.1 | Claude 1–3, Codex 4–6 |
| ticket-consolidation-repair | 2.0.1 | Claude 1–3, Codex 4–6 |

All five package loops start concurrently. Only one trial per package may be active; the global limit is six and expected peak is five. Each package stops at its first valid pass. A sixth Codex trial runs only after five clean failures. Infrastructure errors and unresolved grades are unscored, stop that package and receive no automatic retry. The maximum is 30 launched attempts, three per provider per package, using subscription credentials only.

## Findings and corrections

1. **False zero-call verification.** The original controller always reported `providerCallsMade: 0`, including after dispatch. The reviewed verifier counts durable provider-attempt dispatch receipts separately from launched slot processes. Neither metric purports to count internal model API requests.
2. **Incomplete completion verification.** The original verifier checked preparation but did not audit FINAL or the outcome ledger. The reviewed verifier replays provider order, contiguous trial numbers, concurrency, rewards, per-task stops and totals. It binds counted results to integrity-verified execution records and compares adjudications, outcomes and FINAL. Interrupted campaigns report incomplete status.
3. **Persistence errors during result handling.** The original catch block could apply an error after a state transition to a later slot or surface an exception while other children were running. The reviewed scheduler separates execution/grading errors from evidence-publication errors and drains independent jobs before returning a controller error. A child whose launch-receipt write fails is still awaited.
4. **Preflight coverage.** Both subscription credential modes and the pinned image are checked before the campaign claim. The reviewed seal also covers all frozen bundle and dependency entries. No provider authentication request is made by preflight.
5. **Merged repository test drift.** The first full semantic run had 1,152 passes and nine failures. Tests still used single-attempt installation inputs, omitted the ticket redelivery helper, omitted rollout action/stage ownership records, and restored a capacity placement without activating it. Generator tests still compared successor files to predecessor hashes; they now use the audited source hashes while retaining historical selection assertions. Publication inventory omitted the successor/audit/setup records. These tests and navigation records were updated without changing any task or grading bytes.

## Validation

- All 220 audited task source files in main match the checker audit. Original preparation verifies unchanged, including every slot, package snapshot and the 1,157 frozen source files.
- All 105 existing fresh package-assurance results were rechecked for passing status and binding to the prepared package digests: 22 Capacity, 20 Partial Release, 23 Installation, 20 Rollout and 20 Ticket. This review verified those retained results; it did not rerun all 105 Docker operations.
- 34 controller, policy and evidence tests pass without model calls. They exercise mixed first-pass positions, all 30 clean failures, infrastructure/grading interruptions in every slot position, persistence errors, forged ledgers, nonzero dispatch counts, missing outcomes and orphan dispatches.
- Pure tier: 142 passed, zero failures or skipped tests. Retained results: `.local/successor-setup-review-2026-09-11/pure/summary.json`.
- After the fixture/publication corrections, all 63 tests in the five affected test files passed. The full semantic rerun passed 1,160 of 1,161 tests; its only failure was the separate offline browser runtime's Docker image lookup. After confirming that host Docker resolves the image, the unchanged browser test passed in a focused rerun. All 1,161 unique semantic tests therefore have passing results across that run and the focused rerun; the full tier was not run a third time. Both the failed infrastructure result and successful rerun are retained at `.local/successor-setup-review-2026-09-11/semantic-final/summary.json` and `.local/successor-setup-review-2026-09-11/browser-runtime-host.json`.
- Final typecheck, lint, build, secret scan and `git diff --check` pass. Historical publication-count checks pass. The final readiness and combined validation records are retained at `.local/successor-setup-review-2026-09-11/final-ready.json` and `.local/successor-setup-review-2026-09-11/validation.json`.
- Docker image reports Claude Code `2.1.263` and Codex CLI `0.153.2`, matching READY profiles. Local preflight passes with ten Docker CPUs, about 15.6 GiB Docker memory and over 8 GiB available disk. Both subscription credentials are present; their continued provider validity remains a launch-time concern.

Campaign data remains under `.local/successor-adaptive-trials-2026-09-11`. No dispatch claims exist, `attemptsLaunched` and `providerCallsMade` are zero, and all 30 slots remain unused. Historical trial counts and published qualifying-task standings are unchanged. No commits or pushes were made by this review.
