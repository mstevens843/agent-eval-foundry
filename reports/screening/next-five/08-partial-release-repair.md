# 08 — Partial release repair

Completed one Claude attempt, requested Opus 5 / max. Recorded reward **0**. Authoring **20m 25s**; service **33/33** scenarios; checker **11/11 binary classifications correct**. Both correct alternatives accepted, all nine bad candidates rejected. Zero exact-label matches caused the recorded failure.

## What the task was, in plain English

Repair a client bringing a partly applied resource graph to a requested release. Replacing a parent can require temporarily removing children and then restoring them. A create or remove may return UNKNOWN even though its effect happened. The client must use current authoritative state or eventual receipts to resolve that uncertainty, make only legal dependency-ordered requests, finish the entire target, and preserve other applications' resources.

## What was in the frozen package

Four starter modules (graph, plan, release and transport), two visible test files, and the instruction/API/semantics/checker documents. The public bounds allow at most 40 resources and depth eight; graphs are feasible and acyclic. Receipts return PENDING at most twice before DONE or ABSENT, and inspection remains authoritative throughout UNKNOWN.

The independent service suite covered 33 scenarios and completion, payload, dependency_order and preservation. Checker grading used two correct candidates plus nine negative controls. Both legal intermediate behavior and final state matter; a later repair cannot erase an earlier illegal request.

## Concrete repair and package interaction

Claude consolidated the client into entry.mjs and changed the old modules to re-export its functions. That is a permitted implementation strategy, not an automatic defect.

Its planner computed the descendant closure of resources requiring replacement, removed children before parents, and recreated parents before children. It repeatedly inspected the current graph and chose a presently legal next operation, rather than trusting a stale initial plan. It polled bounded receipts, metered API use below the published cap, and returned completion based on the actual final graph. This resolved both partial effects and restoration requirements in the service suite.

The agent also built substantial checking machinery. Captured commands include a 3,000-case graph fuzz invocation and repeated candidate/checker fuzz exercises. Invocation counts describe its own testing, not additional independent hidden scenarios.

## What the agent did and what grading observed

Claude repaired the release workflow and supporting graph, planning, transport and release modules, added checker.mjs and changed a visible test. Source delta is recorded separately from tool events because shell writes also change files.

The transcript contains 34 Bash calls, 10 Edit calls and two Write calls. Observable checking included a self-built host, candidate bank, graph fuzzing, repeated checker fuzzing, stress runs and cross-process determinism checks. These are observed commands, not independent certification that every self-test was correct. The external verifier—not edited local tests—accepted every service scenario.

The service successfully completed the graph transformation under partial effects, dependency ordering and uncertainty. The checker also identified every candidate correctly.

## Why reward was zero—and why this is not a hardness win

The checker returns explanatory strings such as “completion: scoped id … is absent” and “dependency_order: …”. Every rejected candidate's explanation starts with the expected public check name.

The frozen grader uses reasons.includes(expectedFailingCheck), which requires a whole array element to equal “completion”, not a sentence starting with it. The public instruction asks for a reasons entry that names the violated obligation, and CHECKER-INPUT.md says reasons must include the public check name. Neither clearly specifies that explanatory suffixes are forbidden.

Read-only analysis of the reproduced output confirms **all nine** expected labels appear as explanatory prefixes. The only observed failing gate is exact string equality. No service or binary-checking defect is established. Treat this as a **contract/grader alignment concern**, not clean evidence of model reasoning failure.

## Required next-version repair

Define a structured schema explicitly: for example a separate check ID and explanatory message, or documented exact identifier elements plus optional explanation fields. Make public examples and local interface tests match it. Add a regression accepting informative explanations in the chosen supported format. Do not retain this mismatch as a difficulty mechanism.

After that repair, regrade these same preserved bytes under a separately versioned diagnostic if useful; do not overwrite this result or count the diagnostic as a new model trial. New hardness work should target real graph-planning obligations, not reason formatting.


## Evidence and publication limits

[Sanitized trial record](../evidence/2026-09-08-next-five.json) includes package/profile hashes, submitted-file deltas, observed settings, independent service and checker counts, and hashes of the retained completion manifest and grade. All files listed by that manifest were hash-verified during publication. [Batch index](../README.md) explains the evidence boundary.

The raw transcript and full submitted workspace remain in restricted local storage; this is an editorial analysis of the recorded actions and artifacts, not a publication of private internal reasoning or independently blind-adjudicated evidence. The current [task source](../../../tasks/partial-release-repair/) may have a different build identity. Suggestions are for a new version, not changes to the original result. Self-authored tests, independent service scenarios and checker candidates have different denominators.

## Changes applied since this trial (2026-09-08)

This report's diagnosis was exact: the frozen grader required a whole `reasons` array element to equal the check name, while every rejected candidate's explanation legitimately led with it as a prefix.

**Fix applied**, in the working `.local/post-program/next-five/2026-09-07-p09/source` tree (not this repo's root-level [task source](../../../tasks/partial-release-repair/)): the checker grader now accepts a `reasons` entry that either equals the check id exactly or leads with `"checkId:"` as a prefix. This is a harness change — no scenario, control or reference file for this task was touched.

**Regrade performed exactly as this report requested** — the same preserved submission bytes, under a separately versioned diagnostic, not overwriting this result or counting as a new trial. Re-run against the fixed harness with zero new model calls: now scores as a full pass (11/11 correct, 0 false positives, 0 missed, all 9 controls correctly named). This is the confirmed fix — the "contract/grader alignment concern" this report identified is resolved. Full numbers: restricted regrade record `regrade-2026-09-08.json` (restricted local storage, same evidence boundary as the sanitized trial record above).

**When trials run again:** a fresh attempt against this package should now score correctly on checker grading if it produces reasons in this same explanatory-prefix style.

## 2026-09-09 — Third ranked group: engineering successor for Trial 2

**Ready for a second exploratory trial. No new model attempt was launched for this version.** Priority within the third ranked group: 2/5. Earlier sections describe historical source and results. See the [implementation report](../third-ranked-five-implementation-plan-2026-09-09.md) and [hashed validation evidence](../evidence/2026-09-09-third-ranked-five-implementation.json).

Completed both private service closures, removed all four public implementation modules and old tests importing them, and supplied an empty service entry point. Removed worked dependency/uncertainty and rejection-label explanations from the instruction. The resource, API and checker schemas remain available.

Reason text is now diagnostic only; the previous exact-label disagreement is not a success criterion in this successor. Kept the maintained initialResources, requestedScope and requestedTarget inputs, which the local successor did not fully retain. Removed the computed valid/scope annotations from operation records; the independent checker evaluates the raw before-state and attempted operation.

Aligned idempotent creation with the existing statement that parent lists are sets: duplicate list entries no longer cause an otherwise equivalent resource to be rejected. A regression accepts that legal alternative and rejects an illegal parent removal even when the final graph remains correct. All 33 existing scenarios remain; no hidden crash, concurrent edit or unavailable-receipt obligation was introduced.

Validation passed 14 Foundry assurance checks across 33 scenarios, including the complete reference and alternative services, semantic failure of the untouched service starter, repeatability and control activation. The private checker correctly classified 11/11 candidates: two correct implementations and 9 negative controls, with zero false accepts or misses. Rebuild and fresh recipient reproduction passed.

Native validation passed all 22 static checks and six verifier integrity controls. Harbor's complete oracle returned reward 1; nop returned reward 0, with no Harbor exceptions or verifier infrastructure errors. Nop is rejected for its missing checker deliverable; the separate Foundry starter execution establishes the service's semantic failure. These are provider-free local validation jobs, not new standard/cheat model trials.

Use these exact exports:

- Foundry: `.local/third-ranked-five-implementation-2026-09-09/release-ready/partial-release-repair/export`
- Foundry digest: `5c5b111476f3f48d97db15dac6bb165b0076f8c4363acd0899e434877b709387`
- Native Harbor: `.local/third-ranked-five-implementation-2026-09-09/harbor-ready/partial-release-repair`
- Native digest: `a099f591f32003dee69235a565046eca248dca79e39d45c41b3b6623b090bc5c`

Both deliverables are required. The checker returns complete deterministic Boolean verdicts; optional reason text does not affect grading, and submitted helper modules are available. Public requirements and custom schemas remain supplied without a worked implementation.

When Trial 2 completes, append the actual model/profile, frozen digest, service/checker outcomes, elapsed time, exclusions and final submission defect here. Keep original Trial 1 rewards intact. Local controls, old grading disputes and infrastructure errors are not additional model failures. The final hiring submission still requires its human-authored material and rubric, standard and cheat qualification on the final selected version.

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `partial-release-repair-attempt-1`, package digest
`5c5b111476f3f48d97db15dac6bb165b0076f8c4363acd0899e434877b709387`, route
`professional-multifile/authority-process@1`. Dispatched through this
session's `real-provider` execution route (signed JobStore reservation,
Ed25519, realm `real-provider`, `billingMode: subscription-only`,
`maxMicroUsd: 0`, `maxAttempts: 1`) — a fresh campaign slot (`attempt-1`), not
an infrastructure retry. Controller `campaign.mjs` under
`.local/round-two-third-ranked-five-2026-09-09/`, a small, independently
verified adaptation of the completed top-five campaign's controller, importing
the same isolated, previously-verified runtime
(`.local/round-two-top-five-2026-09-09/frozen-source/dist/index.js`; its
SHA-256 was re-verified unchanged immediately before this dispatch). Author
image `sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`.
Evidence retained at
`.local/round-two-third-ranked-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/partial-release-repair-attempt-1/`.

Target: **claude**. Requested `anthropic/claude-opus-5`, effort `max`, CLI
`scaffoldVersion 2.1.263` (verified baked into the pinned author image, not
merely asserted). Observed from runtime events: `model="claude-opus-5"`
(matches requested); effort and scaffold version are not exposed by the CLI's
event stream and remain unobserved — a known instrumentation limit, not a
data quality problem.

Dispatched 2026-09-09T15:08:41.851Z as one of five reservations installed
within a 231ms window (15:08:41.798Z–15:08:42.029Z); `docker ps` confirmed all
five `foundry-real-*` containers running concurrently, so this was a
genuinely concurrent five-way campaign, not sequential dispatch disguised as
parallel. Completed 2026-09-09T15:24:21.398Z. Total elapsed ≈939,547ms
(~15m40s) — solver authoring time (capture wall clock) ≈932,580ms (~15m33s),
grading ≈7.0s. Token usage: 2,203,919 input tokens (2,105,519 cached), 77,850
output. The CLI's own `total_cost_usd` reports $3.98 for this run; that is
the CLI's internal metered-price estimate for reporting purposes only — no
actual charge occurred, since the signed authorization was
`subscription-only` with `maxMicroUsd: 0`. Execution reached a clean
`completed` state with no invalid-execution or infrastructure error.

### B. What changed since Trial 1

The starter is now a single empty entry point (Trial 1's starter already
supplied the graph/plan/release/transport modules); the checker is a
required, separately-graded deliverable in both trials, and —
directly relevant to Trial 1's own failure — checker reasons are now
diagnostic-only. Trial 1's grader required a `reasons` array element to
equal the check name exactly; every one of its rejections had already named
the check correctly as a sentence prefix, and that grader defect was
identified and fixed on the harness side (see "Changes applied since this
trial" above) before this attempt ran.

### C. Results

**Reward 1 — a clean pass on both deliverables.** Service: `evaluateOutcome`
complete, status `semantic-pass`, all 33 expected scenario IDs observed with
zero failures, zero missing/unexpected IDs. Checker: present, deterministic,
`checkerRequired: true`, `checkerPassed: true`, 11/11 candidates correctly
classified (0 missed, 0 false positives). This directly resolves Trial 1's
original reward-0 — the same underlying planning and checking logic Trial 1
already had would very likely have passed here too, since the exact-string
gate that sank it no longer exists.

### D. Observable solving behavior

The transcript shows the agent read `SEMANTICS.md` and `api.d.ts` first, then
wrote the full `entry.mjs` service in one initial pass. Its documented
algorithm: re-`inspect` the authoritative graph before every single write,
derive fresh (from that exact state, not a cached plan) the one next legal
operation that makes progress, issue it, drain any receipt for hygiene only
(never trusted as the source of truth), and repeat. Ordering is enforced by
computing a child-closed `removeSet` (a parent cannot be torn down while a
current child still references it) and always exhausting removals before any
creation, so a repaired child is never re-attached to a parent that still has
to be replaced. It explicitly reasons in the code comments that this
re-derive-from-ground-truth-every-round design makes every write
dependency-safe by construction and every retry idempotent-safe by the
contract's own idempotency guarantee.

For the checker, it built an independent trace validator that judges each
recorded write's legality against the graph state immediately preceding it
(`before`), preferring the host-recorded `before` when present and falling
back to replaying the observation/receipt stream when it is absent, then
separately checks final-graph completeness and that unrelated resources were
left byte-for-byte untouched. It deliberately does not treat a host-reported
REJECTED/UNKNOWN status as evidence on its own, reasoning in its own comments
that the contract defines the fault as issuing an illegal *request*, decided
from `before`, independent of what the host happened to answer.

Before finalizing, it built a `dev/` self-test harness (`test.mjs`,
`harness.mjs`, `adversarial.mjs`, `diag.mjs`, `verify.mjs`) and iterated on it
live: one visible edit tuned the harness's random-graph generator to scale
with the package's own 40-resource bound (`pick(4)` → `pick(Math.max(1,
Math.min(12, 40 - initial.length)))`) rather than a fixed small number, and a
`python3` patch mid-session refactored `planRemovals`'s internal note-taking
from a plain array into a callback — a real, visible revision during
development, not a one-shot draft. It ran `dev/test.mjs`, a dedicated
`dev/adversarial.mjs` sweep, and a throwaway `dev/diag.mjs` script (deleted
before submission) to chase down specific behavior before settling. Its final
message states plainly: "Both modules are complete, self-contained, and
passing" — a claim the actual grading confirms exactly; no overclaim beyond
what was true.

### E. Comparison and next step

Trial 1 reached the same substantive outcome — correct service, checker
correctly classifying every candidate — and was scored reward 0 purely
because the grader required byte-exact equality against a `reasons` array
element while the checker's rejections legitimately led with the check name
as a sentence prefix. That grader defect was diagnosed in Trial 1's own
analysis, fixed on the harness side, and confirmed via an offline regrade of
Trial 1's preserved submission (11/11, 0 false positives, 0 missed) before
this Trial 2 attempt ever ran. Trial 2's fresh submission — independently
written, not a repair of Trial 1's bytes — passes cleanly under the same
fixed, diagnostic-only-reasons policy, which is exactly the outcome predicted:
this is a genuine resolution of the original interface problem, not a
different submission that merely avoided triggering it (the underlying
planning/checking approach is materially similar to Trial 1's, and both
would score identically under either the old or the fixed grader on the
checker's actual classifications). No further engineering action is needed
on this package's checker-reason interface; retain this correct submission as a control and prioritize packages with observed
service or required-checker failures for further difficulty-search trials.

### F. Verified publication record — September 9, 2026

Reward **1**; service **33/33**; checker **11/11**. All **680** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-third-ranked-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-third-ranked-five.json). Trial 1 is preserved.

## September 11, 2026 — successor 2.0.0 engineering (no new model trial)

This is a new task version, not a regrade of the Trial 2 submission above, which
remains a correct clean pass against the earlier contract. Full rationale, the
obligation-to-coverage matrix, and cross-package validation results are recorded in
the [queue 11–15 successor report](../queue-eleven-fifteen-successors-2026-09-11.md);
this section summarizes only what is specific to this package.

**New business requirement.** SEMANTICS.md's own guarantees ("no externally
concurrent graph changes," "inspect remains authoritative even during UNKNOWN") made
the receipt/token subsystem functionally optional — every accepted Trial 2 solution
simply re-inspected the graph before every write and treated receipts as
hygiene, not evidence, and `reference/checker.mjs` never read the observation trace
at all. Version 2.0.0 adds a server-tracked `generation` per resource id, exposed on
`inspect()` results and on `receipt()` resolutions for create tokens (a create's
`DONE` receipt additionally reports which generation it produced). The scenario
generator is extended so the existing, already-legitimate "temporarily remove a
resource to allow a parent replacement, then restore it" pattern also drives the
*restore* create through the uncertain/`UNKNOWN` path, not just the first create —
making the "old receipt read as evidence about a new incarnation" hazard actually
reachable.

**Why the previous strategy fails.** A solver that treats any terminal receipt
resolution — `DONE` or `ABSENT` alike — as proof a create landed, instead of checking
which outcome it actually received, now silently abandons the restore create when its
own receipt resolves `ABSENT` (meaning that specific attempt did *not* land and must
be reissued), leaving that id's later incarnation never actually created. This is
graded purely at the outcome level (final graph state, and operation legality replayed
from `before`/`after` snapshots) — no new checker clause names "generation" or
"receipt" explicitly; the existing final-scope-completion check and the
create/remove operation-legality replay (which independently rejects a dependent
create whose parent never actually landed) already catch the wrong final graph this
bug produces, by design, so the fix stays purely outcome-based rather than
prescribing how a solver must use receipts.

**Validation.** 33 scenarios grew to 65 (new incarnation-forcing cases layered onto
the existing 32-seed bit-flag generator); 9 controls grew to 10 (new:
`unconfirmed-restore`). Local dry-run: reference and alternative both 0 failures; all
10 controls trip their declared check with their `clean` witness respected; checker
12/12 correct, deterministic, non-mutating. Adversarial probe: weakening the
checker's scope-completion loop causes 5 controls to be wrongly accepted, confirming
that clause is load-bearing; `unconfirmed-restore` stays correctly rejected under that
same weakening, confirming it is caught through the separate operation-legality
mechanism as intended. Native Harbor (real Docker, `--validate`): oracle reward 1
(service 65/65, checker 12/12, all 5 integrity checks pass), nop reward 0 (missing
required deliverable, not an infrastructure error). Local Foundry: 15/15 operations
pass, `local-valid`/`trial-eligible` both allowed. Native export digest
`cef8bcfcecc3df33393e214e7df54b441a742ef54bb89d01c6fe88a4cfc6dc71`. The previously
identified exact-string reason-format defect remains fixed (`reasonPolicy` stays
`"diagnostic-only"`) and was not reintroduced.

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


## 2026-09-11 — corrected-package trial 3 pass audit

The Claude trial-3 pass on corrected v2.0.2 is retained as valid. No false accept
or false reject was reproduced: the service passed 2,028 generated scenarios, and
the checker matched independent rule evaluation on 4,609 cells. The exact service
also passed 114 protected RPC executions; 60 additional protected strategy
executions matched their expected results, and a separately isolated checker run
classified 252/252 cells correctly. Generation-bearing valid round trips passed,
and illegal generation-bearing writes remained rejected.

The package digest remains
`1422a83d7860f81e2bf9bdb52ce634887f2e8da4edcccbe8870cdcfebaadf897`.
No task or grader changes were needed. Trial 2's historical pass also remains
valid; neither trial is null. Original evidence is preserved.

The user's explicit request for another trial after a retained pass authorizes
one fresh confirmation attempt: trial 4 on Codex, prepared in a new namespace.
No model was dispatched by the audit. This exception does not rewrite the prior
stop-on-pass history or turn those passes into failures.

See [the detailed pass audit](../../pass-audits/partial-release-trial-three-2026-09-11.md),
[the machine-readable record](../../pass-audits/partial-release-trial-three-2026-09-11.json),
and [the trial-4 handoff prompt](../../pass-audits/partial-release-trial-four-prompt-2026-09-11.md).


## 2026-09-11 — published successor trial checkpoint

| Physical trial | Provider | Recorded reward | Counted reward | Service | Required checker |
| --- | --- | ---: | ---: | --- | --- |
| 1 | Claude | 0 | 0 | 65/65 pass | Output validation failed |
| 2 | Claude | 1 | 1 | 65/65 pass | 17/17; 0 valid rejected, 0 invalid accepted |
| 3 | Claude | 1 | 1 | 65/65 pass | 22/22; 0 valid rejected, 0 invalid accepted |
| 4 | Codex | 1 | 1 | 65/65 pass | 22/22; 0 valid rejected, 0 invalid accepted; audit pending |

This table is derived from the [published successor evidence](../evidence/2026-09-11-successor-results.json), with exact package/profile identities and completion, result, grade and submitted-code hashes. [Campaign report](../successor-results-2026-09-11.md). Trials here are physical identities within the September 11 successor campaign; earlier trials above belong to their own versions.

T2 and T3 retain audited valid passes. The additional Codex T4 is a recorded pass, pending a separate audit of that submission. These confirmation trials are kept distinct by package digest and do not qualify this solved task for a six-failure set.
