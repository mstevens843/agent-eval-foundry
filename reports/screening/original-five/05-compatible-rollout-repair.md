# 05 — Compatible rollout repair

Claude solved the frozen rollout controller: reward 1, **12/12 scenarios**, reported duration **7m 21s**. The retained attempt has no capture or instruction-contamination issue.

## The task and package

Roll out model releases to a fleet with different consumer ABIs. Select the highest-ranked compatible release, stage it, require fresh health evidence for the exact consumer/release/generation, publish the binding and cache, and restore the correct prior release if the rollout fails. Clean only temporary records owned by this work; preserve other consumers and other jobs' state.

The starter separated catalog selection, health, control flow, cleanup and entry code. Its independent suite checked binding, compatibility, health, completion, cache, rollback, cleanup, reports and preservation. Deliberately incorrect controls isolated wrong ABI, stale green telemetry, wrong binding, broad cleanup and omitted cache publication.

## What the agent changed

- Filtered the catalog by ABI before ranking releases.
- Bound health samples to the exact consumer/release/generation, selected the latest relevant samples, and required both to be healthy.
- Restored each failing service's own previous release instead of the first inventory entry's release.
- Rechecked restored health and refreshed inventory when earlier work could have changed it.
- Tracked preexisting staging records and cleaned up only newly owned records, including on errors.

The recorded process included a driver simulator, checking the simulator against the buggy starter, and thousands of generated fleet/job combinations. These are self-authored checks, not thousands of hidden independent tests. The independent result is that every frozen service scenario passed.

## Construction lesson

This is a competent multi-obligation repair, but its defects were still readily separable from the public contract. The agent reconstructed and verified those obligations without exhausting the intended time budget. Strong local assurance establishes that we measured a solve honestly; it does not turn the package into a hard one.

The earlier proposal to make the rollback target unhealthy contradicts this version's explicit guarantee that prior releases are healthy when restored. That requires a new contract and an attainable fallback policy. It must not be added as a hidden trap. Separate local crash-recovery work is a successor experiment, not a rerun or measured improvement of this attempt.

## Evidence boundary

[Sanitized record](../evidence/2026-09-07-original-five.json) contains the frozen package/profile identity, recorded result and completion hashes. [Maintained source](../../../tasks/compatible-rollout-repair/) is not the submitted solution. [Batch limitations](../README.md) cover profile uncertainty and the distinction between exploratory screening and official qualification.


## Trial 2 preparation — fourth ranked group (2026-09-09)

**Ready for second exploratory trials through Foundry or native Harbor.** No new model attempt is recorded by this engineering work. Removed the public catalog, health, publication, cleanup and controller implementations. Integrated four stage-response-loss cases and two interrupted unhealthy-stage rollback cases, for 18 scenarios. A task-private adapter actually ends the submitted process after stage commits and redelivers the same job with external state/storage intact. Both private services retain original job-entry rollback targets and cleanup scope. Added `resume-without-health` and `forget-job-origin` controls. Kept explicit cleanup rather than the local prototype’s automatic stage-record retirement on bind. Added a typed API and a required independent checker using raw per-job state/history; no private legality verdicts are supplied. This successor has two required deliverables; Trial 1 required only the service.

Both service and checker are required. The public entry is empty, reason strings are optional diagnostics, helper modules are allowed, and the contract retains the facts needed to judge correctness. Existing shared authoring-policy improvements apply; no additional exploration gates were introduced.

Local validation passed 14 assurance checks across 18 service scenarios, including complete reference/alternative services and semantic rejection of the untouched starter. The independent checker classified **11/11** candidates correctly, with zero false accepts or misses. All 22 native static checks and six verifier integrity controls passed. The exact native export earned oracle reward 1 and nop reward 0, with no infrastructure error; nop rejects the absent required checker. Foundry assurance separately verifies the empty service's semantic failure. Export reproduction and targeted regression checks passed.

Foundry export: `.local/fourth-ranked-five-implementation-2026-09-09/release-ready/compatible-rollout-repair/export`. Package digest: `1d016de5fe639a81300ee633d5eb49606400f142eb1e0de37e03926d91f86c7d`. Native digest: `6f94432217f8991a65f9e188a7fb84b49bcde756e7f8950682e9fc54ca03c5be`. Suggested Trial 2 target: **Claude**, retaining this package's original model family. Append the eventual Trial 2 result below this engineering record, preserving Trial 1.

[Group implementation and selection](../fourth-ranked-five-implementation-plan-2026-09-09.md) and [exact validation evidence](../evidence/2026-09-09-fourth-ranked-five-implementation.json) retain file hashes, native trial identities and the remaining final-qualification requirements.

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `compatible-rollout-repair-attempt-1`, package digest
`1d016de5fe639a81300ee633d5eb49606400f142eb1e0de37e03926d91f86c7d`, route
`professional-multifile/authority-process@1`. Dispatched through this session's
`real-provider` execution route (signed JobStore reservation, Ed25519, realm
`real-provider`, `billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`)
— a fresh campaign slot (`attempt-1`), not an infrastructure retry. Author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`
(`foundry-provider-agent-portfolio:2026-09-07`). Evidence retained at
`.local/round-two-fourth-ranked-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/compatible-rollout-repair-attempt-1/`.

Target: **claude**. Requested `anthropic/claude-opus-5`, effort `max`, CLI
`scaffoldVersion 2.1.263` (verified baked into the pinned author image). Observed
from runtime events: `model="claude-opus-5"` (matches requested); effort and
scaffold version are not exposed by the CLI's event stream and remain unobserved
— a known instrumentation limit, not a data quality problem.

Dispatched as one of five reservations installed within a 216ms window
(2026-09-09T16:47:54.943Z–16:47:55.159Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently, so this was a genuinely
concurrent five-way campaign, not sequential dispatch. Completed
2026-09-09T17:18:20.109Z. Total elapsed ≈1,825,057ms (~30m25s) — the longest
of this campaign's five — solver authoring time (capture wall clock)
≈1,815,309ms (~30m15s), grading ≈9.7s. Token usage: 4,915,032 input tokens
(4,758,527 cached), 123,532 output tokens. The CLI's own `total_cost_usd` field
reports $7.03 for this run; that is the CLI's internal metered-price estimate
for reporting only — no actual charge occurred, since the signed authorization
was `subscription-only` with `maxMicroUsd: 0`. Execution reached a clean
`completed` state with no invalid-execution or infrastructure error.

### B. What changed since Trial 1

Trial 1's starter already supplied catalog selection, health, control flow,
cleanup and entry code; this successor's public entry is a single empty
`subject.run`. Two substantive contract changes beyond starter removal, both
new to this trial: **the checker is now a required, separately-graded
deliverable** (Trial 1 was service-only), and the contract gained **stage
lost-response/recovery semantics** — a private adapter can end the submitted
process after a stage commits and redeliver the same job with external
state/storage intact, and the service must still roll back to the release the
service had *before the job's first delivery* and still own only the records
that delivery itself created. Two new negative controls (`resume-without-health`,
`forget-job-origin`) probe exactly this.

### C. Results

Reward 1. Service: all 18 expected scenarios pass, zero failures — including the
four stage-response-loss cases and two interrupted-unhealthy-stage rollback
cases added for this successor. Checker: `checkerRequired: true`,
`checkerPassed: true`, 11/11 candidates correctly classified, 0 missed, 0 false
positives. A clean pass on both required deliverables, and the first time
either the recovery semantics or a checker have been graded for this package.

### D. Observable solving behavior

`entry.mjs` handles interruption/redelivery with a small on-disk journal
(`fs.writeFileSync`+`renameSync` for atomicity) written to `view.storage` before
the job's first stage. The journal records, per service, the deployment
release/generation *at job entry* and the ids of staging records that already
existed before this job touched anything. On redelivery, `readJournal` finds
this journal (keyed by `view.job`, valid while `done !== true`) and reuses its
snapshot instead of re-reading current (possibly job-mutated) state — so a
service already staged by an earlier, interrupted delivery of the *same job* is
recognized via `alreadyStaged` (its generation no longer matches the journal's
recorded entry generation) and is evaluated for health rather than re-staged
from scratch, while rollback still targets the true pre-job release. Cleanup
in a `finally` block removes only staging records absent from the journal's
`pre` set, so pre-existing records survive redelivery too. The journal is
marked `done: true` on successful return.

The agent validated this with a genuinely extensive, iterative self-test
harness under `/tmp/fleet/`: a custom `harness.mjs`/`execCell` simulator,
`fuzz.mjs` (seeded random scenario generation against correct implementations,
run across many seeds — e.g. `2024 77 555111 8080 314159`, later scaled to
"6 seeds × 40 iterations × 3 subjects"), and `fuzzmutants.mjs`/`discriminate.mjs`
(mutant catch-rate testing against deliberately wrong variants, e.g.
`m_settledIgnoresHealth`). Across 40 captured Bash calls, it iteratively patched
`checker.mjs` in place (via inline `python3` string-replace scripts) at least
four times in response to specific gaps its own fuzzing surfaced — including a
telemetry-indexing pass, a "last request per service determines end state" fix,
and an alias/generation staleness check — re-running `discriminate.mjs` and the
seeded fuzz sweeps after each change before finishing. Its final summary
explicitly walks through the journal-based interruption mechanism (matching the
code exactly) rather than asserting success in the abstract; the completion
claim matches the actual graded result with no overclaiming found.

### E. Comparison and next step

Trial 1, working from a substantially pre-implemented starter, reached reward 1
on service-only grading with no checker requirement and no recovery semantics
to satisfy. Trial 2, working from an empty starter, cleanly passed a materially
larger contract: the same service obligations plus a required independent
checker and genuine interruption/redelivery handling, in 30m15s of authoring
time backed by real, deliberate fuzz-driven checker hardening rather than a
single pass. Both the checker requirement and the recovery semantics are new
enough that this is the only data point for either; retain the passing submission as a correct control and prioritize observed
reward-zero candidates for the next failure-finding trials.

### F. Verified publication record — September 9, 2026

Reward **1**; service **18/18**; checker **11/11**. All **787** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-fourth-ranked-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-fourth-ranked-five.json). Earlier trial records are preserved.

## September 11, 2026 — successor 3.0.0 engineering (no new model trial)

This is a new task version, not a regrade of the Trial 2 submission above, which
remains a correct clean pass against the earlier contract. Full rationale, the
obligation-to-coverage matrix, and cross-package validation results are recorded in
the [queue 11–15 successor report](../queue-eleven-fifteen-successors-2026-09-11.md);
this section summarizes only what is specific to this package. Note:
`public/package.json`'s version field was still `1.0.0` despite `SEMANTICS.md`
already prose-labeling itself "version two" since the Trial 2 rewrite — this
successor corrects that mismatch and becomes 3.0.0 in both places, retitling
SEMANTICS.md "version three."

**New business requirement.** This package already had the strongest recovery story
of the five (one durable job-entry snapshot resolving a single, post-`stage`
interruption boundary), and Trial 2's own conclusion recommended extending it, not
replacing it. Version 3.0.0 generalizes the crash boundary to `bind`/`warm`/`cleanup`
as well as `stage`; makes `cleanup({id})` on a non-currently-live staging record
illegal (previously a silent no-op); and adds scenarios where a genuinely later,
different job for the same service completes while an earlier job's own delivery is
still interrupted and un-redelivered. A new obligation, `supersession`, requires a
job whose own delivery was interrupted to recognize, on redelivery, when a
higher-numbered job has already staged the same service, and defer to it rather than
overwrite it.

**Why the previous strategy fails.** The old mechanism (one durable job-entry
snapshot, unconditional redo of stage/telemetry/bind/warm/cleanup on redelivery) was
sufficient only because everything after `stage()` was trivially safe to blindly
redo — telemetry regenerates for free after any stage, and cleanup was idempotent-safe
on anything. Making cleanup illegal on an already-gone id forces genuine per-record
progress tracking instead of a blind unconditional resweep; a solver that never
cross-checks whether a different job has already claimed a service since its own job
started will clobber that newer, legitimately-applied deployment on redelivery.

**Validation.** 18 scenarios grew to 22 (new bind/warm/cleanup-boundary crashes and
successive-job supersession cases); 9 controls grew to 11 (new: `double-cleanup`,
`blind-redeliver-clobber`). Local dry-run: reference and alternative both 0 failures;
all 11 controls trip their declared check with their `clean` witness respected;
checker 13/13 correct, deterministic, non-mutating. Adversarial probe: removing the
`cleanup` non-live-id check causes `double-cleanup` to be wrongly accepted (a clean,
isolated confirmation it is uniquely load-bearing); removing the top-level cross-job
`actionOwnershipOk` gate did not cause `blind-redeliver-clobber` to be wrongly
accepted, since it remains independently caught by the checker's later per-run
status/release cross-check (defense-in-depth, not a gap). Native Harbor (real Docker,
`--validate`): oracle reward 1 (service 22/22, checker 13/13, all 5 integrity checks
pass), nop reward 0 (missing required deliverable, not an infrastructure error).
Local Foundry: 16/16 operations pass, `local-valid`/`trial-eligible` both allowed.
Native export digest `5e52d6ddd28d5c052edf240b224f5780bc4855762383fe94e1077d46398dc38a`.
The previously-rejected "unhealthy rollback fallback" design and the deliberate
absence of a mandated durable-journal format both remain unchanged, preserving two
structurally different correct implementations.

No model trial has been run against this version; per the implementation standards,
the Trial 1/Trial 2 reward counts above do not carry forward to it. This work was
done in an isolated worktree/branch (`next-five-successors-2026-09-11`) and has not
been merged, committed to `main`, or pushed.


## September 11 independent grader audit

The [independent audit](../queue-eleven-fifteen-checker-audit-2026-09-11.md) reproduced and fixed false accepts, false rejects,
API inconsistencies and checker-coverage gaps in the five-package successor handoff.
Its exact audited versions and export digests supersede this document's earlier readiness
claims for those bytes. The final audit passed 4,146 individual-cell comparisons,
28 checker mutations against both local and protected candidate banks, all 40 native
integrity checks and 105 Foundry assurance operations. No model trials were run, and
historical trial counts were not changed.
