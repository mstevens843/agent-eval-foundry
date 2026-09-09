# 04 — Delegated budget repair

Claude solved the frozen service: reward 1, **12/12 scenarios**, reported duration **11m 59s** for the completed retry. The retained earlier capture failure is infrastructure-invalid.

## The task and package

A dispatcher spends credits under versioned delegated grants. Eligibility includes wallet ownership, delegate identity, exact grant version and a cumulative grant lifetime budget across versions. Logical requests may be redelivered. An external debit can return UNKNOWN even when it took effect; the client must reconcile rather than invent success or abandon required work. Historical executed requests must still be reported correctly after a later revocation.

The package supplied six service modules, ordinary visible tests, explicit API/semantics and a protected debit authority. Independent checks covered aggregate budget, ownership, payload, completion, decisions, receipt history and unrelated-state preservation. Negative controls included stale versions, receipt claims, per-request-only budgeting, abandoned uncertainty and no work.

## What the repair did

The agent replaced job-qualified debit keys with stable request IDs and implemented a bounded lookup/retry path for UNKNOWN. It added exact grant-version checks and summed lifetime spending across grant-version rows.

It also corrected a less isolated interaction: cached wallet descriptions went stale as earlier requests in the same job spent credits. The repair invalidated that cache after success and reconciled the reported spending view with locally known committed spending. Finally, it checked external execution history before rejecting a request under a now-revoked grant, preserving truthful historical decisions.

The agent built a contract-oriented fake service, including a view whose reported spending updated between jobs rather than after every local request. The external grading suite accepted the repair on all scenarios.

## What to carry forward

The useful construction combines identity, cumulative allocation, uncertainty and historical reporting. However, this attempt solved the combination quickly. Unknown outcomes alone are not evidence that an outbox-like task will be hard.

An earlier suggestion to revoke grants mid-job exceeds this version's stable-within-job assumptions. Doing that fairly requires a new explicit contract and authority behavior, not a surprise hidden scenario. Separate post-screening interruption work also revised the contract; it is not silently merged into the measured baseline or credited as a new failure.

## Evidence boundary

[Sanitized record and exclusions](../evidence/2026-09-07-original-five.json) use actual retained run IDs; the earlier narrative's attempt numbering was inconsistent. [Maintained source](../../../tasks/delegated-budget-repair/) and [batch limitations](../README.md) distinguish the package from a captured solution. Costs are CLI estimates, not subscription billing.

## 2026-09-09 — Engineering successor prepared for Trial 2

**Ready for a second exploratory Foundry trial; no second model trial has run for this version.** This section is an engineering record, not a new reward result. Priority in the next group: 5/5. See the [selection and implementation report](../next-five-implementation-plan-2026-09-09.md) and [hashed validation evidence](../evidence/2026-09-09-next-five-implementation.json). Earlier trial results and package descriptions above remain historical.

Integrated four interruption scenarios and five additional combinations of interruption with uncertain debit delivery (21 scenarios total). A task-private adapter actually terminates and restarts the submitted process after the configured external debit call; wallet/receipt state and committed local storage survive. Added a local-receipt-only negative control that passes an ordinary witness but mishandles an interrupted response. The private reference and alternative implementations now resolve pending external history before reconsidering present eligibility, covering the combined schedules. Grants remain stable within each job; this change does not introduce hidden mid-job revocations.

Removed the public implementation modules and added an independent release-validator deliverable. Removed derived expected decisions, expected wallet states and expected prefix fields from its input. The checker instead receives raw wallets, ordered requests and grants, actual debit effects/calls and actual per-job snapshots. The private oracle independently derives cumulative budgets and historical decisions from those facts. Trial 2 will therefore measure a new service-plus-validator version, not a rerun of the original service-only task.

Local validation passed 13 service-assurance checks, including correct reference and alternative services, semantic failure of the untouched starter, repeatability and negative-control activation. The independent checker correctly classified 10/10 candidates: two correct implementations and 8 negative controls, with zero false accepts or misses. The Foundry export rebuilt identically and passed fresh recipient validation. All 22 native static checks passed. These controls are author-side evidence, not model attempts or proof that an unseen solver will fail.

Six native verifier integrity controls passed. That run matches the final native export digest. September 9 native preflight: this exact final export passed its Harbor oracle with reward 1 and nop with reward 0, with no infrastructure error. Nop rejects the missing required checker; Foundry assurance separately verifies the empty service starter fails semantically. All five packages in this group passed both native jobs. These are local checks, not Trial 2 model attempts.

Use this exact Foundry export:

- Directory: `.local/next-five-implementation-2026-09-09/release-ready/delegated-budget-repair/export`
- Package digest: `91bbdaf90246fd83051e5f37b2c17bf307ac9affb574e35acb2d28901b3fca82`
- Native build, with the validation boundary above: `.local/next-five-implementation-2026-09-09/harbor-final/delegated-budget-repair`
- Native digest: `e1e2325692993ee1e08d255b1a7d10b48795dd9fe2224e9100a322068fbb0f20`

Both deliverables are required. The checker must return complete deterministic Boolean verdicts; reasons are optional diagnostics and submitted helpers are available. Public API, output schemas and observable requirements remain provided, without a worked implementation.

When Trial 2 finishes, append its actual model/profile, frozen package digest, service and checker outcomes, elapsed time, infrastructure exclusions and observed submission defects here. Do not overwrite Trial 1 or count an infrastructure error, an author control or an old label dispute as a new standard model failure.

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `delegated-budget-repair-attempt-1`, package digest
`91bbdaf90246fd83051e5f37b2c17bf307ac9affb574e35acb2d28901b3fca82`, route
`professional-multifile/authority-process@1`. Dispatched through this session's
`real-provider` execution route (signed JobStore reservation, Ed25519, realm
`real-provider`, `billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`)
— a fresh campaign slot (`attempt-1`), not an infrastructure retry of any prior run.
Author image `sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`
(`foundry-provider-agent-portfolio:2026-09-07`), runtime `.local/round-two-top-five-2026-09-09/frozen-source/`
(built and independently verified earlier this session; SHA-256 re-checked unchanged immediately
before this dispatch). Evidence retained at
`.local/round-two-next-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/delegated-budget-repair-attempt-1/`.

Target: **codex**. Requested `openai/gpt-5.6-sol`, effort `xhigh`, CLI `scaffoldVersion
0.153.2` (verified baked into the pinned author image). Observed from runtime events:
model, effort and scaffold version are not exposed by the Codex CLI's event stream and
remain unobserved — a known instrumentation limit, not a data quality problem.

Dispatched 2026-09-09T13:43:45.479Z as one of five reservations installed within a
230ms window (13:43:45.249Z–13:43:45.479Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently at launch — a genuinely concurrent
five-way campaign. One sibling job (route-policy-repair) was later interrupted by a
host memory-pressure kill of the controller process; that is unrelated to this job,
which completed on its own before the interruption. Completed 2026-09-09T14:02:44.281Z.
Total elapsed ≈1,138,802ms (~18m59s) — solver authoring time ≈1,125,848ms (~18m46s),
grading ≈13s. Execution reached a clean `completed` state with no invalid-execution or
infrastructure error.

### B. What changed since Trial 1

Trial 1 solved a service-only version of this task. This successor adds two changes:
an independent, separately-graded checker is now a required deliverable (this is the
**first trial in which this package's checker was ever graded**), and the target model
family switches from Claude (Trial 1) to Codex this round. The starter's `entry.mjs`
is now empty; per the pre-existing "Engineering successor" record above, the checker's
input was also restructured to raw wallets/requests/grants/effects rather than derived
expected decisions, forcing the checker to independently derive correctness rather than
compare against precomputed answers.

### C. Results

**Reward 1 — a clean pass on both required deliverables, the first time this package's
checker has ever been graded.** Service: all 21 expected scenarios observed with zero
failures, zero missing/unexpected IDs (`semantic-pass`). Checker: `checkerRequired: true`,
`checkerPassed: true`, deterministic, 10/10 candidates correctly classified — 0 missed,
0 false positives. `reasonPolicy` is diagnostic-only for this package; only the boolean
verdict was graded.

### D. Observable solving behavior

The agent's first action was to read the contract and checker interface together
(`SEMANTICS.md`, `CHECKER-INPUT.md`, `entry.mjs`) before writing anything, stating its
plan explicitly: "read the contract and checker interface first, then implement both
sides against the same semantics." It implemented `entry.mjs` first — a compact
`isEligible`/`settle`/`execute` design: eligibility checks owner, delegate, exact grant
version and cumulative `spent + credits <= limit`; `settle()` polls `lookup()` up to
three times to resolve an ambiguous prior debit before allowing a fresh retry, matching
the "must settle by its third observation" comment it wrote into the code; `execute()`
always re-`settle()`s an existing key first (recovering a receipt whose response was
lost across a restart) before attempting a new debit, and treats only `ABSENT` (not
`UNKNOWN`) as license to retry.

It then wrote `checker.mjs` as an independent deterministic trace replay — explicitly
choosing, in its own words, to "map the trace fields into a deterministic replay rather
than trusting candidate reports." Rather than trusting the entry's own decisions, the
checker reconstructs wallet/grant state from raw observations and independently
recomputes eligibility and cumulative spend per grant version.

Before declaring completion, it ran a sequence of ad hoc Node scripts directly against
both modules (visible verbatim in the captured commands): a valid-vs-tampered-trace
check, an accept/reject/duplicate-delivery scenario against `entry.mjs`, a
wrong-budget-order negative case, a grant-revocation-then-reconsideration case, an
owner-mismatch rejection case, then a **100-case randomized stress test** generating
synthetic multi-job histories to check the checker's classification broadly, followed
by a final targeted 2-job edge-case replay. Its last message before completion
specifically calls out: "a request rejected under one grant version is reconsidered
under a later version, while a previously executed request remains accepted after
revocation and keeps its original receipt" — precisely the historical-reporting-after-
revocation requirement this package's contract emphasizes. It closed with `node --check`
syntax validation on both files and an explicit export-shape assertion
(`typeof entry.subject?.run === 'function'`) before its final summary, which accurately
listed both deliverables and the specific properties it had validated — no gap between
its completion claim and the actual grading.

### E. Comparison and next step

Trial 1 (Claude, service-only) reached reward 1 in 11m59s on a version with no checker
requirement. Trial 2 (Codex, service+checker) reached reward 1 in 18m46s of authoring
time — longer, but doing strictly more work (an independently-derived validator against
raw traces, absent in Trial 1's scope), and the model family changed, so this is not a
same-model timing comparison. Both deliverables passed. Retain this submission as a correct control and put
packages with observed required-deliverable failures ahead of this one in the next
trial queue. A future Claude comparison may be useful, but the current result does
not make this package a priority for reward-zero qualification.

### F. Verified publication record — September 9, 2026

Reward **1**; service **21/21**; checker **10/10**. All **736** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-next-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-next-five.json). Trial 1 is preserved.
