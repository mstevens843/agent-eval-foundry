# 04 — Delegated budget repair

**Final 3.0.0 screening result (September 11): 6/6 counted trials returned reward=0, with three Codex and three Claude trials.** This task is one of the [qualifying tasks](../final-results-2026-09-11.md). Full historical trials, audits and excluded attempts remain below.

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


## September 10, 2026 — successor 3.0.0 engineering (no new model trial)

This is a new task version, not a regrade of the successful Trial 2 package. The
original trial evidence and interpretation above are retained verbatim. At the
start of this work all 171 maintained files matched the frozen Trial 2 exports.

### New business requirements and prior simplifying strategy

Immutable reserve/capture/release commands operate on permanently bound wallet/reservation identities and raw authoritative ledgers. Used allowance is lifetime captured credits plus outstanding holds across versions. Capture never frees allowance; release consumes only the named hold's remainder. New holds use current terms; settlement of existing holds survives revocation/version changes. Decisions are revision-fenced and terminal.

The saved Codex dispatcher consumed cumulative spend and stable per-job grant terms. The successor must reconstruct availability from reservations/settlements and reconcile uncertain mutations across term changes without treating pending work as available funds.

### Additional coverage and implementation evidence

Multiple grants and up to four wallets, within-job term changes, lower limits, revoked/replaced delegates, cross-version settlements, repeated commands, closed reservation identities and delayed old releases near allowance boundaries.

An alternative retries an idempotent resolve while the receipt is pending and recovers from malformed input. Ignored holds, capture-releasing-funds, current-version settlement checks, cross-wallet aggregation, stale reserve versions and abandoned uncertainty are rejected.

Complete private service and checker references, authority/schema updates, legal
alternatives, controls and reproducible Foundry/native Harbor exports are included.
Public core entry points remain empty. The new service reference and alternative
pass 19/19 scenarios; the reference checker passes 10/10 candidate traces.
Untouched starters fail semantically and lack the required checker. These are local
engineering validations, **not provider/model trial results or hardness evidence**.

No new defect in the earlier successful submitted code is asserted: its former
contract differs. Historical defect claims, where present above, retain their
original evidence and scope. The five separate successful finalists and their
standings remain unchanged; this successor adds zero to that count.

See the [consolidated implementation report](../next-five-successor-implementation-2026-09-10.md)
and [machine-readable evidence](../evidence/2026-09-10-next-five-successors.json)
for exact commands, native oracle/nop and integrity outcomes, full export digests,
resolved development failures and the subsequent grading-review handoff.


## Pretrial hardening of successor 3.0.0 — September 10, 2026

Added closed-reservation reuse, excess settlement, isolated ownership/delegation errors, incorrect denials and wrong receipts. Historical settlement, exact string identities, snapshot reordering and idempotent recovery remain accepted.

Reference service: **21/21**. Both complete correct alternatives pass. Required checker: **17/17** classifications over the full scenario population, with diagnostic-only reasons. Native oracle returns 1; untouched nop returns 0 without an infrastructure error. All nine native integrity controls pass.

Foundry export: `.local/next-five-hardening-2026-09-10/release-four/delegated-budget-repair/export`. Digest: `db688724f5b932b9e0ee619e1202da3de81a636a37ef90976490702fb24c5f66`. Native export: `.local/next-five-hardening-2026-09-10/harbor-frozen-v2/delegated-budget-repair`. Digest: `ef15605caab0378c5f113bf6ea8fb393c88ffc892f5389050ac7b30e4e0eb772`.

The [hardening report](../next-five-hardening-2026-09-10.md), [obligation map](../next-five-hardening-coverage-2026-09-10.md) and [evidence](../evidence/2026-09-10-next-five-hardening.json) record the added cases, mutation audit, protections and frozen artifacts. These are engineering checks before model trials, not another scored trial or a historical regrade. Prior trial results above are unchanged.

## Trial 3 — hardened successor 3.0.0, attempt 1 — September 10–11, 2026

First model trial on the hardened 3.0.0 package, dispatched concurrently with the
other four hardened-next-five-trial-one packages at 2026-09-11T01:13:37.181Z
against the frozen `hardened-next-five-trial-one-2026-09-10` runtime (source digest
`153bdf9d0675e7d4ca59a7fe9b21430e887d24e889db7bbfb134e5dc4d7fa41d`). Requested
profile: `openai/gpt-5.6-sol`, effort `xhigh`, via Codex (`profileDigest`
`a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641`). Package
digest `db688724f5b932b9e0ee619e1202da3de81a636a37ef90976490702fb24c5f66`, matching
the hardened export above.

Reward **0**. Service **21/21** (`semantic-pass`) — the submitted repair itself
is correct. Checker **14/17** (3 false positives, 0 missed, deterministic): the
submitted checker incorrectly rejects `reference`, `alternative` and
`variant-idempotent-settlement` — three genuinely correct implementations — as
false positives. A checker that rejects known-correct implementations does not
discriminate the contract's real obligations, so the required-checker failure is
a legitimate reward-zero outcome under the task contract, not a grading
artifact. 10m50s of authoring (capture completed before the incident below),
492,326 input tokens (452,096 cached) and 24,477 output tokens (Codex CLI usage;
no price reported). Job id `delegated-budget-repair-attempt-1`.

**Publication incident and recovery.** This attempt's capture, grading and
checker evaluation all completed normally, but the campaign's publish step then
raised `EVIDENCE_BYTE_LIMIT`: `publishEvidence`/`verifyEvidence` walked the
staged evidence tree (283 MiB — 21 checker-grade candidates, each contributing a
several-megabyte `process.log`/`result.json` pair, versus roughly 14–15
candidates pre-hardening) against a generic 128 MiB default that had never been
given an explicit, evidence-publication-specific budget. The job was left
"publishing" with its capture, grade and result already written to
`.incomplete/delegated-budget-repair-attempt-1/` — an infrastructure incident on
publication, not a re-solve, a re-grade, or a change to the score above.

The fix, applied to the live repository (not the frozen campaign runtime): an
explicit `EVIDENCE_PUBLICATION_BUDGET_BYTES` constant (512 MiB) threaded only
into `publishEvidence`/`verifyEvidence` (`src/execution/artifacts.ts`);
`regularTree`'s own default and every solver-submission size limit
(`copyArtifactTree`, `package-route.ts`, `real-provider.ts`) are unchanged. For
future runs, the per-candidate `process.log` is now gzip-compressed at write
time (`src/packages/local-process.ts`, opt-in `logCompression: "gzip"`),
losslessly preserving stdout and stderr — including any diagnostic content not
captured in `result.json` — while removing the near-total byte-for-byte
duplication between `process.log` and `result.json` that drove the growth.
Both changes are covered by new local tests (no provider calls):
`test/execution-lifecycle.test.ts` (budget enforcement, tampering detection) and
`test/package-production.test.ts` (lossless gzip capture).

Because the frozen executor (source digest `153bdf9d...`) predates this fix and
its own executor-version guard correctly refuses to resume a job under a
different source identity, recovery did not resume the frozen campaign in
place. A separate, explicitly non-executor recovery tool
(`.local/hardened-next-five-trial-one-2026-09-10/publication-recovery-2026-09-11/recover.mjs`,
sha256 `ff5d5b53cc812d6a0a68a0508021cf5a7d18560393a80b02ea572ce89f06c4a1`)
independently re-verified the already-complete capture/grade/checker evidence
(byte budget, package/profile/executor identity, checker false-positive detail)
before publishing it, unchanged, with the live repository's corrected budget.
The original identity was read verbatim from the stage's own `prepared.json`,
never reconstructed. Published to
`real-campaign-frozen/jobs/real-provider/publication-recovery/delegated-budget-repair-attempt-1`
(1,399 files, verified). A full incident/fix/recovery manifest, hash-linking the
recovery tool separately from the original executor, is at
`.local/hardened-next-five-trial-one-2026-09-10/publication-recovery-2026-09-11/manifest.json`,
and the original `dispatch-errors/delegated-budget-repair.json` record is
preserved unchanged.

This is the first scored trial on the hardened 3.0.0 revision. It stands
independently of the Trial 2 (successor) pass recorded above; the earlier
package's contract, checker and scenario population all differ. See
[the campaign summary](../hardened-next-five-trial-one-2026-09-10.md) and
[sanitized evidence](../evidence/2026-09-10-hardened-next-five-trial-one.json)
for the other four packages' results.


## Independent post-trial audit — September 11, 2026

The recovered **reward 0** is confirmed. All 1,399 recovered files match their pre-recovery backup; publication recovery made no new solver call and changed no grade. Offline replay reproduces rejection of the correct reference trace: the checker's `jobId(job)` reads `job.job` or `job.id`, neither of which exists on the raw input job objects, then compares `undefined` with the numeric job associations in mutations, prefixes and reports. The frozen reference checker accepts those same facts. The `-21` run-directory suffix denotes scenarios per candidate, not candidates; this bank contains 17 candidates.

See the [full independent audit](../../hardened-next-five-pass-audit-2026-09-11.md) and [hashed evidence](../../evidence/2026-09-11-hardened-next-five-pass-audit.json). This audit made zero provider calls and preserved the original trial records.


## Coverage-v2 integrated and next trial prepared — September 11, 2026

Existing ledger/job-association coverage is retained. The saved service passes 21/21. Its checker rejects three valid candidates (14/17 with ordinary tokens) and also drops the required `__proto__` verdict with opaque tokens. The original completed reward-zero evidence remains in publication-recovery, without a model rerun.

Public 3.0.0 instructions, interfaces and starters are byte-identical to Trial 3. The corrected private Foundry package is `087aa9c0f84f0940202fd7c55ac9d042d6d689e09cc0b298e680c0d4ba00db7c`. Reference validation passes **21/21 service scenarios and 17/17 checker candidates**. Native oracle/nop and integrity checks pass. These are replays and engineering checks, not new model attempts; the historical reward remains recorded.

The next authorized run is **Trial 4**, one fresh **Codex** attempt alongside the other four packages. It has been prepared but not dispatched. See the [integrated coverage report](../next-five-coverage-v2-2026-09-11.md), [exact evidence](../evidence/2026-09-11-next-five-coverage-v2.json) and [operator handoff](../../../docs/hardened-next-five-trial-two-handoff.md).

## Trial 4 — 3.0.0 / coverage-v2 — September 11, 2026

Second model attempt on the unchanged public 3.0.0 contract, first on the corrected private grading revision coverage-v2. Campaign: `.local/hardened-next-five-trial-two-2026-09-11/`, frozen runtime source digest `b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`. Job id `delegated-budget-repair-attempt-1`, package digest `087aa9c0f84f0940202fd7c55ac9d042d6d689e09cc0b298e680c0d4ba00db7c`, profile digest `a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641` (requested `openai/gpt-5.6-sol`, effort `xhigh`, via Codex). Dispatched 2026-09-11T03:55:41.439Z, completed 2026-09-11T04:12:31.742Z (16m51s wall; 970,965ms / 16m11s authoring per `capture.json`). Usage: 2,555,092 input tokens (2,483,200 cached), 46,891 output tokens (Codex CLI usage; no price reported). Published to `.local/hardened-next-five-trial-two-2026-09-11/real-campaign-frozen/jobs/real-provider/records/delegated-budget-repair-attempt-1/`; independently re-verified this session (`verifyEvidence`): 1,312 files, all hashes match. No infrastructure error — the prior Trial 3 `EVIDENCE_BYTE_LIMIT` publication incident, which specifically affected this package, did not recur; the 512 MiB budget and gzip log compression fix held cleanly (`grading/process.log.gz` present).

Reward **0**. Service **semantic-pass, 21/21** scenarios (`grade.json`'s `evaluation`: `expectedIds`/`observedIds` match exactly, no `missingIds`/`unexpectedIds`/`problems`) — the submitted repair itself is correct.

The submitted checker has two independent, stacked defects, both confirmed by reading the actual submitted source at `grading/submission/checker.mjs` in this record.

First (shared with three other packages in this trial — route policy, browser replay, recurring calendar): coverage-v2 replaced descriptive checker-grade candidate names with opaque per-run tokens. This package's bank (`grading/checker-grade/cases/cases.json`) lists 17: `__proto__`, `constructor`, `toString`, an empty string, `"0"`, `"01"`, `"token/λ"`, and `candidate-H` through `candidate-Q`. The checker builds `const verdicts = {}` (line 554) and assigns via bracket notation inside `run({ cases })` (line 560: `verdicts[token] = ...`). Assigning to a plain object's `"__proto__"` key by bracket notation does not create an own property — it goes through `Object.prototype`'s inherited `__proto__` accessor instead — so the checker's own JSON output is missing that key. Directly confirmed: the raw `checker-process.log` has 16 verdict keys where 17 were expected, and `Object.prototype.hasOwnProperty.call(verdicts, "__proto__")` is false.

Second, and dominant — this is why every verdict, including completely ordinary candidates, reads `{"ok":false,"reasons":["malformed checker cell input"]}`: `run({ cases })` (line 553) iterates `for (const cell of cases)` and calls `validateCell(cell)` (line 559) directly on each outer case object. But a case's actual shape (confirmed via `cases.json`) is `{ token, cells: [ {scenarioId, input, actual, decisions, ...}, ... ] }` — the real per-scenario `input` lives one level down, inside the `cells` array, not on the case object itself. `validateCell` (line 237–243) reads `cell?.input` directly and, finding it `undefined` on every case, fails its very first shape check and returns `["malformed checker cell input"]` unconditionally — before any budget/reservation/settlement logic ever runs. This checker never validates a single real candidate; it rejects everything by construction, independent of the opaque-token issue above.

Because the `"__proto__"` key is missing regardless (first defect), the frozen harness's `completeVerdicts()` shape gate fails and `gradeChecker()` falls through to its synthetic all-failed result rather than reaching per-candidate scoring — so the recorded "0 correct" is, in this specific case, an accurate reflection of the checker's output (the second defect means it would have scored 0 anyway), but for a reason unrelated to the shape gate itself. Both defects are real and worth recording separately: the opaque-token/`__proto__` interface-coverage gap recurring across four of five packages this trial, and this package's own, more severe cell-shape bug that makes its checker non-functional independent of that. Service passed; the required checker deliverable failed — a legitimate reward-zero outcome under the task contract.

No additional model calls were made. This trial's evidence and interpretation are independent of the Trial 1/2/3 and audit sections above, which used a different task version or grading revision.


## Third 3.0.0 attempt prepared — historical Trial 5

September 11, 2026 UTC: one fresh **Codex** attempt is prepared, concurrently with the other four tasks, using the exact package, profile and frozen runtime from Trial 4. This is attempt **3** on the public 3.0.0 task and is labeled **Trial 5** in this document's full history. No new model call has been launched by preparation. The provider remains the same for this round; any opposite-provider block comes later under a separate handoff. Previous results and replay accounting are unchanged.

## Trial 5 — 3.0.0 / coverage-v2, attempt 3 — September 11, 2026

This is the third model attempt on the unchanged public 3.0.0 contract, byte-identical packages/grading/runtime to Trial 4 (source digest `b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`). The solver is blind to all previous submissions, grades, reference solutions and analysis docs — this is an independent fresh attempt. Campaign: `.local/hardened-next-five-trial-three-2026-09-11/`. Job id `delegated-budget-repair-attempt-1`, package digest `087aa9c0f84f0940202fd7c55ac9d042d6d689e09cc0b298e680c0d4ba00db7c`, profile digest `a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641` (requested `openai/gpt-5.6-sol`, effort `xhigh`, via Codex, same profile as Trial 4). Dispatched 2026-09-11T05:07:22.578Z, completed 2026-09-11T05:25:10.908Z (17m48s wall; 1,027,879ms / 17m08s authoring per `capture.json`). Usage: 1,233,417 input tokens (1,162,368 cached), 36,568 output tokens (Codex CLI usage; no price reported). Published to `.local/hardened-next-five-trial-three-2026-09-11/real-campaign-frozen/jobs/real-provider/records/delegated-budget-repair-attempt-1/`, independently re-verified this session (`verifyEvidence`): 1,309 files, all hashes match, no infrastructure error.

Reward **0**. Service **semantic-pass, 21/21** scenarios (`grade.json`'s `evaluation`: `expectedIds`/`observedIds` match exactly, no `missingIds`/`unexpectedIds`/`problems`) — the submitted repair itself is correct.

This fresh checker avoids both of this package's Trial 4 defects (the `__proto__` shape-gate collision and the `validateCell(cell)`/`cell.cells[]` shape bug that rejected everything as malformed) — it reaches full, valid per-candidate scoring: `grading/checker-grade/grade-summary.json` reports `total:17, correct:14, falsePositives:3, missed:0, deterministic:true`. The 3 false positives are `variant-idempotent-settlement`, `alternative` and `reference` — the checker incorrectly rejects both known-good baselines plus one legitimate variant as invalid.

The cause is a distinct, precisely identified defect, confirmed by reading the actual submitted `grading/submission/checker.mjs`: `jobId(job)` (lines 197–201) extracts a job's identifier only from `job.job`, `job.id`, or `job.view.job`. But this task's real `input.jobs[]` entries (confirmed against `grading/checker-grade/cases/cases.json`) carry no such property — they are shaped `{grants, requests, race}`, with no identifier field at all. `jobId()` therefore returns `undefined` for every job in every candidate, and the caller at line 376 (`if (id === undefined || !requests) { addReason(reasons, "job ${ji} is malformed"); continue; }`) unconditionally reports every job as malformed. This is confirmed directly in the raw `checker-process.log`: all 17 tokens' verdicts open with the identical `"job 0 is malformed"`, `"job 1 is malformed"`, … reasons, regardless of whether the underlying candidate is a genuine negative control or a correct implementation. Because any rejection reason satisfies "correctly rejected" for the 14 true negative-control candidates, this bug happens to leave their classification accidentally right — but it also unconditionally rejects the 3 true-positive candidates, which is the direct cause of the 3 false positives above. The checker never actually reaches its budget/reservation/settlement validation logic for any candidate; its per-job identity extraction fails first, every time.

Note the same false-positive pattern (rejecting `reference` and `alternative`) also appears in this same Trial 5 campaign's `recurring-calendar-repair` attempt — both are independently-generated Codex checkers this round landing on the same class of outcome (rejecting the known-good baselines), though via different specific bugs; this is not the same code.

No infrastructure interruption. No additional model calls were made. This trial's evidence and interpretation are independent of the Trial 1/2/3/4/audit sections above, which used earlier task versions or grading revisions.

See the [prepared execution handoff](../../../docs/hardened-next-five-trial-three-handoff.md) and [verification manifest](../evidence/2026-09-11-hardened-next-five-trial-three-preparation.json).


## Trial 6 preparation — fourth 3.0.0 attempt, provider switch

Prepared September 11, 2026 UTC. The next attempt uses **Claude**, switching from the previous provider, with 2 GiB of authoring memory. It is one of five concurrent attempts in the [new handoff](../../../docs/hardened-next-five-trial-four-handoff.md). Public version 3.0.0, the coverage-v2 grader, package digest and solver instruction remain unchanged. No model call occurred during preparation and this section records no new trial result.

The [infrastructure report](../browser-runtime-reliability-2026-09-11.md) documents the independent runtime build, bounded resource diagnostics, core-dump prevention, local regression checks and recovered disk headroom. The [preparation manifest](../evidence/2026-09-11-hardened-next-five-trial-four-preparation.json) binds the exact next profile and all unchanged package bytes. All Trial 5 completion manifests were reverified. Prior trial outcomes remain intact.

## Trial 6 — fourth 3.0.0 attempt / coverage-v2 / provider switch — September 11, 2026

This is the fourth model attempt on the unchanged public 3.0.0 contract, with all five providers switched from Trial 5 (this package moves from Codex to Claude). Task and coverage-v2 grader packages are byte-identical to Trials 4/5; the frozen runtime was rebuilt only to add browser-authoring memory mitigation and resource diagnostics for a different package (source digest `597df061330dad6fc300dc1bf12fdbc12d29817b1e6d58c80732fc4dea71accc`), which does not affect this package's grading. The solver is blind to all previous submissions, grades, reference solutions and analysis docs. Campaign: `.local/hardened-next-five-trial-four-2026-09-11/`. Job id `delegated-budget-repair-attempt-1`, package digest `087aa9c0f84f0940202fd7c55ac9d042d6d689e09cc0b298e680c0d4ba00db7c` (unchanged from Trials 4/5), profile digest `d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794` (requested `anthropic/claude-opus-5`, effort `max`, via Claude Code — switched from Codex). Dispatched 2026-09-11T06:41:21.957Z, completed 2026-09-11T07:08:05.019Z (26m43s wall; 1,563,295ms / 26m03s authoring per `capture.json`). Usage: 5,705,840 input tokens (5,532,594 cached), 133,473 output tokens, $7.836225 (subscription billing). Published to `.local/hardened-next-five-trial-four-2026-09-11/real-campaign-frozen/jobs/real-provider/records/delegated-budget-repair-attempt-1/`, independently re-verified via `verifyEvidence` this session: 1,353 files, all hashes match, no infrastructure error.

Reward **0**. Service **semantic-pass, 21/21** scenarios (`grade.json`'s `evaluation`: `expectedIds`/`observedIds` match exactly, no `missingIds`/`unexpectedIds`/`problems`) — the submitted repair itself is correct.

This attempt's checker is an entirely fresh, independently-generated implementation — its structure has no relation to either the Trial 4 submission (which stacked the `__proto__` bug with a separate `validateCell(cell)`/`cell.cells[]` shape defect) or the Trial 5 submission (a `jobId()` field-extraction bug). It has neither of those two specific defects. Confirmed directly against the actual submitted `grading/submission/checker.mjs`: `run(payload)` builds `const verdicts = {}` (line 36) and assigns per-candidate results via bracket notation, `verdicts[token] = reasons.length ? { ok: false, reasons } : { ok: true }` (line 53). Assigning to the literal key `"__proto__"` on a plain object does not create an enumerable own property — it collides with `Object.prototype`'s inherited `__proto__` accessor instead — so the checker's own output is missing that one key. `grading/checker-grade/cases/cases.json` lists 17 opaque tokens for this package, including `"__proto__"`; the raw `checker-process.log` confirms exactly 16 of the 17 expected keys are present. Because the frozen harness's `completeVerdicts()` shape check requires an exact key-count match, `gradeChecker()` falls through to its synthetic all-failed fallback (no `grade-summary.json` written) rather than a real per-candidate score — the checker's true judgment on the other 16 tokens was never actually scored.

All three Claude attempts in this Trial 6 campaign (recurring calendar, workflow authority, delegated budget) independently hit this identical `__proto__` shape-gate bug this round, while both Codex attempts (route policy, browser replay) achieved clean checker passes — a striking provider-correlated split this trial, worth watching across future rounds rather than treating as proven from one data point.

No infrastructure interruption. No additional model calls were made. This trial's evidence and interpretation are independent of the Trial 1/2/3/4/5/audit sections above, which used earlier task versions, grading revisions, or providers; do not alter or reinterpret those earlier sections.


## Round 5 preparation — historical Trial 7 (September 11, 2026)

The preceding Round 4 / historical Trial 6 reward 0 remains counted. This package’s export is byte-identical to the last trial.

The next attempt is prepared on **Claude**, the same provider as Round 4, using **coverage-v2**. All five tasks launch concurrently into fresh blind workspaces. Round 5 is the fifth campaign on public 3.0.0 and historical Trial 7 in this document. Preparation itself makes no model call and contributes no outcome.

[Coverage and counting report](../browser-coverage-v3-2026-09-11.md) · [Counting disposition](../evidence/2026-09-11-browser-round-four-disposition.json) · [Round 5 handoff](../../../docs/hardened-next-five-trial-five-handoff.md).


## Conditional continuation after Round 5 — prepared September 11, 2026

The user authorized continuing after new reward-zero results, stopping this task on its next pass or at six counted trials with three Codex and three Claude. The already-running Round 5 is unchanged and must finish before the continuation starts. The [explicit counting ledger](../evidence/2026-09-11-hardened-six-counting-ledger.json) records the previously documented first-round regrades and retains excluded attempts separately; preparation adds no trial result. See the [remaining-slot plan](../hardened-six-continuation-preparation-2026-09-11.md) and [operator handoff](../../../docs/hardened-six-continuation-handoff.md).

## Round 5 and continuation — historical Trials 7-8 — 3.0.0 — September 11, 2026

Both solvers were blind to all previous submissions, grades, reference solutions, analysis docs, and to each other's attempt. Private coverage-v2, unchanged from Round 4. Package digest `087aa9c0f84f0940202fd7c55ac9d042d6d689e09cc0b298e680c0d4ba00db7c` (unchanged), profile digest `d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794` (requested `anthropic/claude-opus-5`, effort `max`, via Claude Code, same provider as Round 4) for both attempts. Runtime: byte-identical copy of the completed Round 4 frozen runtime (source digest `597df061330dad6fc300dc1bf12fdbc12d29817b1e6d58c80732fc4dea71accc`), not rebuilt.

**T7 — historical Trial 7 (Round 5).** Job id `delegated-budget-repair-attempt-1`, campaign `.local/hardened-next-five-trial-five-2026-09-11/`. Dispatched 2026-09-11T08:20:45.134Z, completed 2026-09-11T08:49:20.921Z (28m36s wall; 1,673,323ms / 27m53s authoring per `capture.json`). Usage: 8,069,674 input tokens (7,874,236 cached), 141,419 output tokens, $9.427486 (subscription billing). Reward **0**. Service `semantic-pass`, 21/21. Checker: shape-gate failure — the `__proto__`-into-plain-object bug. `cases.json` lists 17 opaque tokens including the literal `"__proto__"`; the actual `checker-process.log` output has 16 of 17 keys, missing only `"__proto__"`. The submitted `checker.mjs` builds `const verdicts = {}` (line 721) and assigns via bracket notation, `verdicts[String(token)] = ...` (line 738) — the same class of defect seen across this campaign. Unlike this package's own Round 4/Trial 6 attempt, which stacked this bug with a separate cell-shape defect (`validateCell` reading `cell.input` on the wrong object), this submission correctly reads `c.cells` (line 726) — a single, cleaner defect than Trial 6's.

**T8 — historical Trial 8 (Round 6 continuation), user-authorized follow-up since T7 failed.** Job id `delegated-budget-repair-attempt-1`, campaign `.local/hardened-six-continuation-2026-09-11/slots/delegated-budget-repair/trial-8/`. Same provider/profile as T7. Dispatched immediately on T7's failure, completed 2026-09-11T09:28:26.056Z (authoringMilliseconds 2,219,984 / 37m00s). Usage: 14,171,787 input tokens (13,937,043 cached), 184,266 output tokens, $13.922845 (subscription billing). Reward **0**. Service `semantic-pass`, 21/21. Checker: the same `__proto__` bug class, independently reproduced by a distinct implementation — 17 expected tokens, 16 actual, missing `"__proto__"`. This submission's `checker.mjs` also builds `const verdicts = {}` (line 200) and assigns via bracket notation, `verdicts[token] = ...` (line 218), and also correctly reads `entry?.cells` (line 204) — no second stacked defect here either.

Both completion manifests independently re-verified via `verifyEvidence` this session: T7 1,313 files, T8 1,313 files, all hashes match, no infrastructure error.

**Final disposition.** With T8's failure, this task reached the **six-counted-trial stop condition automatically** (per the user's explicit continuation rule: continue after clean reward-zero results until six counted trials with three Codex and three Claude): final tally **6 scored, 6 failures, providers 3 Codex + 3 Claude**, `stopReason: "six-counted"`, 0 unused slots. This is a complete, balanced six-trial record meeting the ≥5/6 target with room to spare.

No infrastructure interruption on either attempt. This trial's evidence and interpretation are independent of the earlier Trial 1-6/audit sections above, which used earlier task versions, grading revisions, or occurred before these specific attempts; do not alter or reinterpret those earlier sections.
