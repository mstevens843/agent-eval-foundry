# 20 — Workflow authority repair

**Final 3.0.0 screening result (September 11): 6/6 counted trials returned reward=0, with three Codex and three Claude trials.** This task is one of the [qualifying tasks](../final-results-2026-09-11.md). Full historical trials, audits and excluded attempts remain below.

## Outcome

Claude, requested Opus 5 / max, completed in **18 minutes 13 seconds**. Its service
passed **30/30 scenarios**. Its checker correctly classified **14/14 candidates**
and named the private primary label for **11/12** negative candidates. The original
record nevertheless gives **reward 0** because of the remaining label disagreement.

That disagreement is a **confirmed grading-alignment defect**, not evidence that the
agent failed to understand the workflow. The public prompt explicitly assigns the
observed defect to `terminal_history`; the checker reported that exact obligation,
while grading insisted on `completion`. Original results are preserved unchanged.

## What the task was, in plain English

A broker executes queued jobs on behalf of an originating user. Jobs can have scheduled,
retry and fan-out descendants. The worker or immediate parent carrying the job does
not necessarily own the authority: the broker must follow the parent chain to the
original principal, then determine whether that principal currently has a valid grant
path for the exact resource and action.

Permissions can change between inspection and admission. If the policy revision has
changed, the broker must reconsider the request under the new policy. Once a job has
a durable decision, a duplicate delivery must reuse it rather than deciding or
executing the job again. Every delivery—including denied and repeated work—must
finish against the decision belonging to its own job.

The intended challenge combines changing authority with positive work and durable
history. Refusing everything is not correct, but neither is applying a grant from
the wrong ancestor or rewriting a decision after a restart.

## What was in the package

The original service was split into context, grant, admission, dispatcher and service
modules. Its public contract described the job catalog, revocable grants, atomic
revision-checked admission, durable receipts, delivery completion and restart behavior.
A separate checker had to compare original jobs and deliveries, raw admission-time
policies, actual decisions/effects and external call records.

There were 30 protected service scenarios and fourteen checker candidates: two correct
implementations and twelve negative controls. Before this run, the checker input was
corrected to expose the original delivery population and actual admission policy
snapshots without exposing a computed allow/deny answer. Completion also stopped
depending on an unnecessary final queue read. Those changes support outcome-based
grading; they do not themselves make the underlying problem harder.

## What the agent actually did

The capture contains 27 shell calls plus file-editing operations. Claude moved the
implementation into a self-contained `entry.mjs` and kept the old source-module import
paths working through re-exports. It also created a retained host simulator and tests,
and separate temporary checker-validation tools.

1. It replaced the immediate-parent lookup with a walk to the root ancestor. The
   starter really did use the parent's principal, so this is a demonstrated semantic repair.
2. It consulted durable receipts before admission. The starter always entered the
   admission path on delivery; the repair reuses prior decisions across duplicate jobs
   and restarts instead of producing another decision/effect.
3. It added durable in-flight bookkeeping so an unfinished delivery could be closed
   after interruption. The decision still comes from the external receipt, not the
   local breadcrumb. The agent's simulator and tests explicitly exercise restart shapes.
4. It replaced enumeration of simple grant paths with breadth-first reachability,
   retaining exact resource/action filters and excluding authority manufactured by cycles.
   This is an optimization of an existing mechanism, not proof that the starter's
   path enumeration was semantically wrong.
5. It preserved revision-aware admission: a stale response triggers a fresh policy
   read and a new decision. The final checker independently validates the grant chain
   against the policy at admission, rather than trusting a claimed permission result.

Its final local suite contains eleven tests. Its own checker bank contains 29 candidates:
four intended-correct alternatives and 25 mutants, including a different valid grant
path and a correct implementation returning no diagnostic report. Captured validation
reports correct classification and repeatability. It also tested fourteen input-shape
variations and a fabricated self-report layered over a no-op execution.

Those shape variants were mostly the agent's robustness experiments, not extra hidden
requirements. Likewise, its benchmark of 348 candidates × seven cells, checked twice
in roughly 58 ms at about 86 MB RSS, describes its synthetic local workload. The final
grant search still scans the grant list for each visited principal, so the final
message's strict O(V+E) claim is too strong without an adjacency index. It is nevertheless
bounded and substantially avoids enumerating every simple path.

## The specific grading mistake

The `misattribute-delivery` control closes deliveries against decisions belonging to
other jobs. The agent rejected it and described the exact mismatched delivery, job
and decision associations under `terminal_history`.

The public instruction explicitly says a finish referencing the wrong decision names
`terminal_history`. The original protected run also marks both `terminal_history` and
`completion` as failing. However, the checker grader accepted only the control manifest's
primary label, `completion`, and turned an otherwise correct checker result into zero.

This is unusually clear evidence of an evaluator mistake: the answer follows the
visible instruction and is supported by the evaluator's own observations. It must
not be recycled as an example of a model missing a secondary invariant. All fourteen
accept/reject decisions were right; no bad candidate escaped and no correct one was
rejected. The audit checks original saved files and hashes, not a replacement run.

## What to carry forward

The agent successfully handled the identity/history interaction this package was
designed to expose. It also built negative controls for its own checker and checked
that reported evidence could not substitute for real effects. That is useful evidence
about what this configuration handled well, not a new hardness success.

Fix the universal reason-label rule before further trials, while retaining private
primary labels as construction activation checks. Future hardening should focus on
contract-supported combinations that the existing local simulator could miss—for
example distinct valid grant paths combined with a revision change and replayed terminal
work—not an undisclosed preference for one path or label. Any changed authority
semantics need to be public, bounded, and tested against alternative correct approaches.

The code's fixed retry limits and ignored breadcrumb write failures are review candidates,
not demonstrated failures under the frozen guarantees. Do not manufacture a failing
scenario outside those guarantees and call the old submission wrong.

## Evidence and limits

[Sanitized batch evidence](../evidence/2026-09-08-fourth-five.json) preserves the original
zero, service/checker counts, timing, changes and capture hashes, with the grading-defect
assessment alongside it. Raw submissions, command output and the original-label audit
remain private. This is one exploratory attempt, not a replicated capability finding,
official benchmark qualification or independent blind adjudication. Observable tool
use is described; private internal reasoning is not analyzed.

## Changes applied since this trial (2026-09-08)

This report's diagnosis was exact and is the cleanest case in the batch: the public instruction explicitly names `terminal_history` for exactly this defect, the checker reported it, and the original protected authority confirms both `terminal_history` and `completion` genuinely failed — yet grading required only the one privately-designated primary label, `completion`, and rejected a correct diagnosis for using the contract's own stated name.

**Fix applied**, in `src/packages/portfolio.ts` (harness-wide, all four source trees this project maintains, plus the separate frozen tree the real dispatch actually ran against): `gradeChecker`'s `namedRightCheck` now credits a checker for naming ANY obligation a control's own real, authoritative trace actually failed, not just the one designated primary. `control.check` keeps its original, narrower job (deciding whether a scenario window is wide enough to make a control's defect observable at all) untouched. This is a harness change — no scenario, control or reference file for this task was touched.

**Regrade confirms the fix, exactly as this report anticipated.** The same preserved submission bytes, under a separately versioned diagnostic, not overwriting this result or counting as a new trial: re-run against the fixed harness with zero new model calls, now scores a full pass (14/14 correct, 0 false positives, 0 missed, all 12 controls correctly named — up from 11/12). The `misattribute-delivery` control that triggered this specifically is now credited for its `terminal_history` naming, which the public instruction always required to be acceptable.

**When trials run again:** this package's grading should now correctly accept any submitted checker that names an obligation the public instruction itself directs it to name, per this report's exact recommendation ("retaining private primary labels as construction activation checks" while fixing "the universal reason-label rule").

## 2026-09-09 — Engineering successor prepared for Trial 2

**Ready for a second exploratory Foundry trial; no second model trial has run for this version.** This section is an engineering record, not a new reward result. Priority in the next group: 4/5. See the [selection and implementation report](../next-five-implementation-plan-2026-09-09.md) and [hashed validation evidence](../evidence/2026-09-09-next-five-implementation.json). Earlier trial results and package descriptions above remain historical.

Replaced the supplied service modules with an empty entry point and completed both private service closures. Removed explicit receipt-first recovery and policy-refresh implementation advice while preserving observable origin, authority-at-effect and terminal-history requirements. Kept the maintained raw job catalog and admission-policy facts needed by the checker; did not adopt the successor's loss of those inputs. Tightened restart handling so a fabricated submission exception cannot cause an authority restart. Retained 30 scenarios and the crash-history control. The independent private checker derives root origin and authorization paths separately from the grader, then validates effect and terminal records. Reason text is diagnostic only; the historical exact-label discussion above applies to older versions.

Local validation passed 17 service-assurance checks, including correct reference and alternative services, semantic failure of the untouched starter, repeatability and negative-control activation. The independent checker correctly classified 14/14 candidates: two correct implementations and 12 negative controls, with zero false accepts or misses. The Foundry export rebuilt identically and passed fresh recipient validation. All 22 native static checks passed. These controls are author-side evidence, not model attempts or proof that an unseen solver will fail.

Six native verifier integrity controls passed. The final native wording differs from the tested export; verifier and oracle file bytes were independently compared and are identical. September 9 native preflight: this exact final export passed its Harbor oracle with reward 1 and nop with reward 0, with no infrastructure error. Nop rejects the missing required checker; Foundry assurance separately verifies the empty service starter fails semantically. All five packages in this group passed both native jobs. These are local checks, not Trial 2 model attempts.

Use this exact Foundry export:

- Directory: `.local/next-five-implementation-2026-09-09/release-ready/workflow-authority-repair/export`
- Package digest: `fc6161cdfdea1084e976ed3ce39bd7995b97fc936d238e1afbad4c0c89f84cc6`
- Native build, with the validation boundary above: `.local/next-five-implementation-2026-09-09/harbor-final/workflow-authority-repair`
- Native digest: `b03405f56c19cc1e6b2fecbdc812b309372864cbc7da29cb4e994374dde017d6`

Both deliverables are required. The checker must return complete deterministic Boolean verdicts; reasons are optional diagnostics and submitted helpers are available. Public API, output schemas and observable requirements remain provided, without a worked implementation.

When Trial 2 finishes, append its actual model/profile, frozen package digest, service and checker outcomes, elapsed time, infrastructure exclusions and observed submission defects here. Do not overwrite Trial 1 or count an infrastructure error, an author control or an old label dispute as a new standard model failure.

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `workflow-authority-repair-attempt-1`, package digest
`fc6161cdfdea1084e976ed3ce39bd7995b97fc936d238e1afbad4c0c89f84cc6`, route
`professional-multifile/authority-process@1`. Dispatched through the round-two-next-five
campaign's `real-provider` execution route (signed JobStore reservation, Ed25519, realm
`real-provider`, `billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`) — a
fresh campaign slot (`attempt-1`), not an infrastructure retry. Runtime: the isolated
`frozen-source/` build made and independently verified earlier this session (its SHA-256
was re-checked unchanged immediately before this dispatch). Author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`
(`foundry-provider-agent-portfolio:2026-09-07`). Evidence retained at
`.local/round-two-next-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/workflow-authority-repair-attempt-1/`.

Target: **codex**. Requested `openai/gpt-5.6-sol`, effort `xhigh`, CLI
`scaffoldVersion 0.153.2` (verified baked into the pinned author image). Model, effort
and scaffold version were not exposed by the Codex CLI's event stream and remain
unobserved for this run — a known instrumentation limit for Codex specifically, not a
data quality problem.

Dispatched 2026-09-09T13:43:45.423Z as one of five reservations installed within a
230ms window (13:43:45.249Z–13:43:45.479Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently at launch. One sibling job in this
same batch (route-policy-repair, a different package) was later interrupted by a
host memory-pressure kill of the controller process; that interruption is unrelated
to this job, which completed its own full lifecycle independently and cleanly.
Completed 2026-09-09T13:56:30.792Z. Total elapsed ≈765,369ms (~12m45s) — solver
authoring time (capture wall clock) ≈756,299ms (~12m36s), grading ≈9.1s. Execution
reached a clean `completed` state with no invalid-execution or infrastructure error.

### B. What changed since Trial 1

Model target switches from Claude (Trial 1) to Codex this round. The starter is now a
single empty `subject.run` entry point, replacing Trial 1's already-partially-repaired
source-module split. The independent checker is a required, separately-graded
deliverable. Most directly relevant to Trial 1's outcome: the harness-side fix recorded
above (`gradeChecker`'s `namedRightCheck` crediting any obligation a control's real
trace actually failed, not only the one privately-designated primary label) is now
built into the grading path this attempt was scored against — Trial 1's own confirmed
grading-alignment defect is structurally no longer possible for a checker that behaves
the way Trial 1's did.

### C. Results

**Reward 1 — a clean pass on both required deliverables.** Service: all 30 expected
scenarios observed with zero failures, zero missing/unexpected IDs (`evaluation.status:
semantic-pass`). Checker: `checkerRequired: true`, `checkerPassed: true`, 14/14
candidates correctly classified — 0 missed, 0 false positives. `reasonPolicy` is
diagnostic-only for this package; only the boolean accept/reject verdict was graded,
not reason text. This directly resolves Trial 1's original reward-0 outcome.

### D. Observable solving behavior

30 captured events across a single Codex turn. The agent first read the whole
workspace in two `bash` calls (`rg --files`, then `sed -n` over `SEMANTICS.md`,
`api.d.ts`, `CHECKER-INPUT.md`, `instruction.md`, the empty `entry.mjs` starter, and
`package.json`) before writing any code — a single `file_change` produced both
`entry.mjs` and `checker.mjs` together. `entry.mjs`'s core logic: `buildOrigins()`
walks each job's `parent` chain to the root principal (memoizing per chain node);
`authorityPath()` runs a breadth-first search from the resource's owner outward over
active grants matching the resource/action, marking visited principals to block
cycles, and returns the first simple path reaching the origin. `run()` consults
`api.receipt()` before ever calling `decideFresh()`, so duplicate/replayed deliveries
reuse the durable decision instead of re-deciding; `decideFresh()` loops on
`stale`/`request`-error responses to re-read policy and re-decide under the current
revision; `finish()` is retried on non-`stored` results without advancing `take()`.

After writing the code, the agent ran `node --check` on both files, then a sequence of
hand-authored inline Node scripts (`node - <<'NODE' ... NODE`) importing `entry.mjs`
and `checker.mjs` directly to simulate specific scenarios: a parent/child job pair
checking origin resolution, a `git diff`-paired sanity run, an explicit reachability-search
test mirroring `authorityPath()`'s own algorithm, and an empty-input edge case
(`cells: []`) against the checker. `grep`-confirmed in the raw capture: a
`Math.random`-driven loop generating on the order of 300 synthetic scenarios did run
(the stdout log contains two `Math.random` call sites and matching `for (let i` loop
bodies alongside literal "300" references), substantiating the agent's own final
claim of "300 randomized service scenarios passed" rather than that being an
unverified assertion. No failed self-test, reverted edit, or contradicted completion
claim was observed in this run — its final summary ("Node syntax checks passed / 300
randomized service scenarios passed / Adversarial checker mutations were correctly
rejected / Checker is deterministic and does not mutate inputs") matches the actual
grading outcome.

### E. Comparison and next step

Trial 1 (Claude) also produced a fully correct 30/30 service and a checker that
correctly classified all 14 candidates — its reward-0 was traced, confirmed, and
fixed as a harness label-naming defect unrelated to the submission's own correctness
(documented above, with a diagnostic regrade of Trial 1's *original, unchanged*
submission scoring 14/14 under the fixed harness). Trial 2, on a different model and a
freshly empty starter, independently reached the same outcome — full service
correctness and a checker with zero missed defects and zero false positives — cleanly,
with no reason-label ambiguity to navigate at all under the now-diagnostic-only reason
policy. This is not evidence the harness fix specifically enabled this pass (Codex's
checker never emitted a `terminal_history`/`completion`-style secondary-label
disagreement to be credited), but it does confirm the *starter-removal* change alone
did not make this package harder for a capable submission: two different models, two
different starters (partially-repaired vs. empty), same clean result. Given two
consecutive clean passes (accounting for the harness-fixed regrade), this package
looks solid; recommend deprioritizing further exploratory trials here in favor of
packages with an unresolved genuine capability gap.

### F. Verified publication record — September 9, 2026

Reward **1**; service **30/30**; checker **14/14**. All **879** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-next-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-next-five.json). Trial 1 is preserved.


## September 10, 2026 — successor 3.0.0 engineering (no new model trial)

This is a new task version, not a regrade of the successful Trial 2 package. The
original trial evidence and interpretation above are retained verbatim. At the
start of this work all 171 maintained files matched the frozen Trial 2 exports.

### New business requirements and prior simplifying strategy

Authorization admission, external dispatch commitment and delivery completion are separate. Authority must hold at every accepted authorized admission and at dispatch. Conditional dispatch fences both admitted and current revisions; durable terminal outcomes survive later revocation and duplicate delivery. Committed receipts may be temporarily pending.

The saved Codex service could use one atomic decision/effect call and receipt lookup. It must now reconcile stale pending authorizations, externally committed but temporarily unobservable receipts and independently completed deliveries without a prescribed local journal.

### Additional coverage and implementation evidence

Root provenance through depth-six ancestry, varied resources/actions, multiple independent grant paths, revocation of only one path, staleness after inspection and admission, and interruption after admission/dispatch/outcome/finish.

A reverse-order valid-path search with harmless invalid-dispatch recovery passes. Admission-only completion, pending-as-complete, intermediate-principal origin, wrong payload, empty path and deny-all controls fail semantically.

Complete private service and checker references, authority/schema updates, legal
alternatives, controls and reproducible Foundry/native Harbor exports are included.
Public core entry points remain empty. The new service reference and alternative
pass 36/36 scenarios; the reference checker passes 10/10 candidate traces.
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

Added invalid superseded admissions (path, origin and payload) and wrong delivery/decision association. Correct repeated admissions, dispatch retries and alternate valid path traversal pass.

Reference service: **36/36**. Both complete correct alternatives pass. Required checker: **15/15** classifications over the full scenario population, with diagnostic-only reasons. Native oracle returns 1; untouched nop returns 0 without an infrastructure error. All nine native integrity controls pass.

Foundry export: `.local/next-five-hardening-2026-09-10/release-four/workflow-authority-repair/export`. Digest: `f7e8ebedfb12bad0fa67e7841e213d78991620e5266cc115a01f98b79bf8cdd0`. Native export: `.local/next-five-hardening-2026-09-10/harbor-frozen-v2/workflow-authority-repair`. Digest: `09350245104dbac12c6675b328cd38a8c063854daffa720ae89c15ea7450d19b`.

The [hardening report](../next-five-hardening-2026-09-10.md), [obligation map](../next-five-hardening-coverage-2026-09-10.md) and [evidence](../evidence/2026-09-10-next-five-hardening.json) record the added cases, mutation audit, protections and frozen artifacts. These are engineering checks before model trials, not another scored trial or a historical regrade. Prior trial results above are unchanged.

## Trial 3 — hardened successor 3.0.0, attempt 1 — September 10–11, 2026

First model trial on the hardened 3.0.0 package, dispatched concurrently with the
other four hardened-next-five-trial-one packages at 2026-09-11T01:13:37.119Z
against the frozen `hardened-next-five-trial-one-2026-09-10` runtime (source digest
`153bdf9d0675e7d4ca59a7fe9b21430e887d24e889db7bbfb134e5dc4d7fa41d`). Requested
profile: `openai/gpt-5.6-sol`, effort `xhigh`, via Codex (`profileDigest`
`a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641`). Package
digest `f7e8ebedfb12bad0fa67e7841e213d78991620e5266cc115a01f98b79bf8cdd0`, matching
the hardened export above.

Reward **0**. Service **36/36** (`semantic-pass`) — the submitted repair itself
is correct. Checker **13/15** (2 false positives, 0 missed, deterministic): the
submitted checker incorrectly rejects `alternative` (the known-good alternative
reference solution) and `variant-replacement-and-retry` (a genuinely correct
positive variant), both as false positives. A checker that rejects known-correct
implementations does not discriminate the contract's real obligations, so the
required-checker failure is a legitimate reward-zero outcome under the task
contract, not a grading artifact. 14m7s of authoring (job completed
2026-09-11T01:28:05.764Z), 735,794 input tokens (673,408 cached) and 31,023
output tokens (Codex CLI usage; no price reported). No infrastructure
interruption on this attempt. Job id `workflow-authority-repair-attempt-1`,
published to
`real-campaign-frozen/jobs/real-provider/records/workflow-authority-repair-attempt-1`
with a verified 868-file completion manifest.

This is the first scored trial on the hardened 3.0.0 revision. It stands
independently of the Trial 2 (successor) pass recorded above; the earlier
package's contract, checker and scenario population all differ. See
[the campaign summary](../hardened-next-five-trial-one-2026-09-10.md) and
[sanitized evidence](../evidence/2026-09-10-hardened-next-five-trial-one.json)
for the other four packages' results and the publication-recovery incident
affecting two of them (not this one). Notably, the same "checker rejects the
correct reference/alternative" failure mode recurs on the other two Codex
attempts in this trial —
[04-delegated-budget-repair.md](../original-five/04-delegated-budget-repair.md) and
[18-recurring-calendar-repair.md](../fourth-five/18-recurring-calendar-repair.md) —
which also hit the publication incident described there.


## Independent post-trial audit — September 11, 2026

The recorded reward remains **0**, but the earlier claim that its original rejection was free of grading artifacts is corrected here. The rejected positive candidates were `alternative` and `variant-replacement-and-retry`; `reference` was accepted. In `case-027`, the host returns PENDING for an unknown dispatch token after a denied job. The public contract requires a request error and associates PENDING with committed external work. Restoring that documented host response and recapturing the two affected cells makes the saved checker classify the original bank **15/15**.

A separate genuine checker defect was also reproduced: a complete reference variant repeats an executed dispatch after its terminal receipt, without an extra effect. Both original and corrected hosts produce service passes; the saved checker incorrectly rejects this legal idempotent retry as `commits a terminal job` and regresses its reconstructed delivery state. The reference checker accepts it. Thus the checker still has a demonstrated defect, but the new counterexample does not erase the original host bug. Integrate the host correction and this positive retry control, then revalidate before further trials. Original grades and counting disposition were not silently changed.

See the [full independent audit](../../hardened-next-five-pass-audit-2026-09-11.md) and [hashed evidence](../../evidence/2026-09-11-hardened-next-five-pass-audit.json). This audit made zero provider calls and preserved the original trial records.


## Coverage-v2 integrated and next trial prepared — September 11, 2026

The host now rejects unknown dispatch tokens after denial, and a legal terminal dispatch-retry positive candidate is integrated. The saved service passes 36/36. Its checker accepts the original 15 candidates under the corrected host and rejects only the new legal retry (15/16). This confirms the independent checker defect while preserving the original host-bug attribution.

Public 3.0.0 instructions, interfaces and starters are byte-identical to Trial 3. The corrected private Foundry package is `2a51be6fc49db809f3c59151526cd6fe97acd9c9a83216ab8842d55f390771f2`. Reference validation passes **36/36 service scenarios and 16/16 checker candidates**. Native oracle/nop and integrity checks pass. These are replays and engineering checks, not new model attempts; the historical reward remains recorded.

The next authorized run is **Trial 4**, one fresh **Codex** attempt alongside the other four packages. It has been prepared but not dispatched. See the [integrated coverage report](../next-five-coverage-v2-2026-09-11.md), [exact evidence](../evidence/2026-09-11-next-five-coverage-v2.json) and [operator handoff](../../../docs/hardened-next-five-trial-two-handoff.md).


## Trial 4 — 3.0.0 / coverage-v2 — September 11, 2026

Second model attempt on the unchanged public 3.0.0 contract, first on the corrected private grading revision coverage-v2. Campaign: `.local/hardened-next-five-trial-two-2026-09-11/`, frozen runtime source digest `b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`. Job id `workflow-authority-repair-attempt-1`, package digest `2a51be6fc49db809f3c59151526cd6fe97acd9c9a83216ab8842d55f390771f2`, profile digest `a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641` (requested `openai/gpt-5.6-sol`, effort `xhigh`, via Codex). Dispatched 2026-09-11T03:55:41.365Z, completed 2026-09-11T04:12:00.570Z (16m20s wall; 957,291ms / 15m57s authoring per `capture.json`). Usage: 998,047 input tokens (942,336 cached), 38,558 output tokens (Codex CLI usage; no price reported). Published to `.local/hardened-next-five-trial-two-2026-09-11/real-campaign-frozen/jobs/real-provider/records/workflow-authority-repair-attempt-1/`, independently re-verified via `verifyEvidence`: 897 files, all hashes match, no infrastructure error.

Reward **0**. Service **semantic-pass, 36/36** scenarios (`grade.json`'s `evaluation`: expected/observed ids match exactly, no missing/unexpected ids or problems) — the submitted repair itself is correct.

Coverage-v2 replaced descriptive checker-grade candidate names with opaque per-run tokens for every candidate. `grading/checker-grade/cases/cases.json` lists 16 tokens for this package: `__proto__`, `constructor`, `toString`, an empty string, `"0"`, `"01"`, `"token/λ"`, and `candidate-H` through `candidate-O`. Unlike three other packages dispatched in this same trial (route-policy-repair, browser-replay-repair, recurring-calendar-repair), this submitted checker's verdicts object correctly includes all 16 tokens, including `"__proto__"`: `grading/submission/checker.mjs` (lines 517-526) builds its result via `Object.defineProperty(verdicts, token, {...})` rather than plain bracket assignment (`verdicts[token] = ...`), which correctly creates an own property for any key name, avoiding the `Object.prototype.__proto__` accessor collision that broke the other three checkers' output shape. Because the output has the correct shape, `completeVerdicts()` passes and the harness computed a real, complete per-token score rather than falling back to a synthetic zero result: `grading/checker-grade/grade-summary.json` reports `total:16, correct:12, falsePositives:4, missed:0, deterministic:true`. The 4 false-positive candidateIds (mapped from opaque tokens back to human-readable labels in `details`) are `alternative`, `variant-terminal-dispatch-retry`, `variant-replacement-and-retry`, and `reference` itself.

This is worse than the engineering prediction two sections above ("rejects only the new legal retry, 15/16"): the live submitted checker also incorrectly rejects `reference` (the canonical known-good baseline) and `alternative` (the other known-good implementation) as false positives, not just the new legal dispatch-retry candidates. That prediction was reference-checker validation against the corrected host, not a forecast of what a fresh model-submitted checker would produce — the two are different artifacts and this result does not contradict the earlier reference-checker figures, but it is a materially worse outcome than "reject only the new candidate." This is a genuine content-level misjudgment (not a shape/structural crash like the other three packages in this trial), and it is why service passed but the required checker deliverable failed — a legitimate reward-zero outcome under the task contract.

No infrastructure interruption. No additional model calls were made beyond this one authorized attempt. This trial's evidence and interpretation are independent of the Trial 1/2 sections above, which used a different task version or grading revision.


## Third 3.0.0 attempt prepared — historical Trial 5

September 11, 2026 UTC: one fresh **Codex** attempt is prepared, concurrently with the other four tasks, using the exact package, profile and frozen runtime from Trial 4. This is attempt **3** on the public 3.0.0 task and is labeled **Trial 5** in this document's full history. No new model call has been launched by preparation. The provider remains the same for this round; any opposite-provider block comes later under a separate handoff. Previous results and replay accounting are unchanged.

See the [prepared execution handoff](../../../docs/hardened-next-five-trial-three-handoff.md) and [verification manifest](../evidence/2026-09-11-hardened-next-five-trial-three-preparation.json).

## Trial 5 — 3.0.0 / coverage-v2, attempt 3 — September 11, 2026

Third model attempt on the unchanged public 3.0.0 contract, byte-identical package/grading/runtime to Trial 4 (frozen source digest `b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`). The solver is blind to all previous submissions, grades, reference solutions and analysis docs — this is an independent fresh attempt, not informed by Trial 4's specific defect. Campaign: `.local/hardened-next-five-trial-three-2026-09-11/`. Job id `workflow-authority-repair-attempt-1`, package digest `2a51be6fc49db809f3c59151526cd6fe97acd9c9a83216ab8842d55f390771f2`, profile digest `a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641` (requested `openai/gpt-5.6-sol`, effort `xhigh`, via Codex, same profile as Trial 4). Dispatched 2026-09-11T05:07:22.516Z, completed 2026-09-11T05:23:46.447Z (16m24s wall; 959,906ms / 16m00s authoring per `capture.json`). Usage: 2,039,072 input tokens (1,973,504 cached), 46,910 output tokens (Codex CLI usage; no price reported). Published to `.local/hardened-next-five-trial-three-2026-09-11/real-campaign-frozen/jobs/real-provider/records/workflow-authority-repair-attempt-1/`, independently re-verified via `verifyEvidence`: 896 files, all hashes match, no infrastructure error.

Reward **0**. Service **semantic-pass, 36/36** scenarios (`grade.json`'s `evaluation`: expected/observed ids match exactly, no missing/unexpected ids or problems) — the submitted repair itself is correct.

This fresh checker fails in a different and more fundamental way than this package's Trial 4 attempt (which reached full per-candidate scoring with a genuine content-level false-positive defect on 4 of 16 candidates). This time no `grading/checker-grade/grade-summary.json` is written at all. Read directly: `grading/submission/checker.mjs`'s exported `run({cases})` (lines 584–596) does `return cases.map((candidate) => { ...; return { token, accept }; })` — a flat **array** of `{token, accept}` objects, not the `{verdicts: {token: {ok, reasons}}}` object shape that `completeVerdicts()`/`gradeChecker()` (`src/packages/checker-contract.ts`, `src/packages/portfolio.ts`) require. Confirmed against the raw `grading/checker-grade/checker-process.log`: `parsed.first`/`parsed.second` are literally JSON arrays of 16 `{"token":"...","accept":false}` entries each, and every single one of the 16 opaque tokens (including `__proto__`, `constructor`, `toString`, the empty string, `"0"`, `"01"`, `"token/λ"`, and `candidate-H` through `candidate-O`) reads `accept:false` — 0 of 16 accepted.

The 100% rejection is not incidental to the shape bug — it is independently caused by a second, distinct defect in `validateCell` (checker.mjs line 422 on). Line 424 checks `!Array.isArray(cell.original)` and line 434 assigns `const deliveries = cell.original;`, but the actual cell objects in `grading/checker-grade/cases/cases.json` have no `original` field at all — the real field is named `deliveries` (confirmed directly: each cell's `deliveries` is an array of records like `{"id":"delivery-0","jobId":"root-0","worker":"admin"}`; `cell.original` is `undefined`). Since `Array.isArray(undefined)` is `false`, `validateCell`'s very first check fails unconditionally for every cell in every candidate, before any real workflow-authority logic ever runs — so even if `run()` returned the correct `{verdicts: {...}}` shape, this checker would still reject 100% of candidates on a field-name mismatch alone. Two independent, stacked defects: the checker never attempts the required output contract (array of `{token,accept}` instead of a `verdicts` map with `ok`/`reasons`), and even its own internal acceptance logic can never return `true` because it reads the wrong property name for delivery records.

This is a distinct, new failure mode from Trial 4's attempt on this same package — not a recurrence of that defect (which was a genuine accuracy problem on a checker with a working, correctly-shaped output) — and arguably a more severe regression, since this submission never engages with the real grading contract or the real task data at all. Service passed; the required checker deliverable failed — a legitimate reward-zero outcome under the task contract.

No infrastructure interruption. No additional model calls were made beyond this one authorized attempt. This trial's evidence and interpretation are independent of the Trial 1/2/3/4 sections above, which used earlier task versions or grading revisions; do not alter or reinterpret those earlier sections.


## Trial 6 preparation — fourth 3.0.0 attempt, provider switch

Prepared September 11, 2026 UTC. The next attempt uses **Claude**, switching from the previous provider, with 2 GiB of authoring memory. It is one of five concurrent attempts in the [new handoff](../../../docs/hardened-next-five-trial-four-handoff.md). Public version 3.0.0, the coverage-v2 grader, package digest and solver instruction remain unchanged. No model call occurred during preparation and this section records no new trial result.

The [infrastructure report](../browser-runtime-reliability-2026-09-11.md) documents the independent runtime build, bounded resource diagnostics, core-dump prevention, local regression checks and recovered disk headroom. The [preparation manifest](../evidence/2026-09-11-hardened-next-five-trial-four-preparation.json) binds the exact next profile and all unchanged package bytes. All Trial 5 completion manifests were reverified. Prior trial outcomes remain intact.

## Trial 6 — fourth 3.0.0 attempt / coverage-v2 / provider switch — September 11, 2026

Fourth model attempt on the unchanged public 3.0.0 contract, with all five providers switched from Trial 5 (this package moves from Codex to Claude). Task and coverage-v2 grader packages are byte-identical to Trials 4/5; the frozen runtime was rebuilt only to add browser-authoring memory mitigation and resource diagnostics for a different package (source digest `597df061330dad6fc300dc1bf12fdbc12d29817b1e6d58c80732fc4dea71accc`), which does not affect this package's grading. The solver is blind to all previous submissions, grades, reference solutions and analysis docs. Campaign: `.local/hardened-next-five-trial-four-2026-09-11/`. Job id `workflow-authority-repair-attempt-1`, package digest `2a51be6fc49db809f3c59151526cd6fe97acd9c9a83216ab8842d55f390771f2` (unchanged from Trials 4/5), profile digest `d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794` (requested `anthropic/claude-opus-5`, effort `max`, via Claude Code — switched from Codex). Dispatched 2026-09-11T06:41:21.895Z, completed 2026-09-11T07:02:47.951Z (21m26s wall; 1,264,607ms / 21m05s authoring per `capture.json`). Usage: 3,391,524 input tokens (3,260,297 cached), 109,725 output tokens, $5.6863085 (subscription billing). Published to `.local/hardened-next-five-trial-four-2026-09-11/real-campaign-frozen/jobs/real-provider/records/workflow-authority-repair-attempt-1/`, independently re-verified via `verifyEvidence` this session: 929 files, all hashes match, no infrastructure error.

Reward **0**. Service **semantic-pass, 36/36** scenarios (`grade.json`'s `evaluation`: expected/observed ids match exactly, no missing/unexpected ids or problems) — the submitted repair itself is correct.

This package's checker has now failed three different ways across three trials: Trial 4's genuine content-level false positives (12/16 correct, real scoring); Trial 5's flat-array output shape plus a `cell.original`/`cell.deliveries` field-name mismatch (0/16, never engaged the real contract); and now, for the first time, the `"__proto__"` shape-gate collision that has separately affected route-policy-repair, browser-replay-repair, recurring-calendar-repair and delegated-budget-repair at various points in Trials 4/5. Confirmed directly against this attempt's submitted `grading/submission/checker.mjs`: line 22 declares `const verdicts = {};` and line 41 assigns via bracket notation, `verdicts[token] = reasons.length === 0 ? { ok: true } : { ok: false, reasons };`. Because `Object.prototype.__proto__` is an inherited accessor, assigning to the literal key `"__proto__"` on a plain object does not create an enumerable own property. `grading/checker-grade/cases/cases.json` lists 16 opaque tokens for this attempt (`__proto__`, `constructor`, `toString`, an empty string, `"0"`, `"01"`, `"token/λ"`, and `candidate-H` through `candidate-P`); the raw `grading/checker-grade/checker-process.log` output has exactly 15 keys, missing only `"__proto__"`. `completeVerdicts()`'s exact-key-count shape check fails on that single missing key, so `gradeChecker()` falls through to its synthetic all-failed fallback rather than a real per-candidate score — no `grade-summary.json` was written, and the checker's true judgment on the other 15 tokens was never actually scored.

Three consecutive, structurally distinct defects on one package is strong evidence that each fresh, independently-authored submission is genuinely different code, not a repeated pattern specific to this task. Separately, all three Claude attempts dispatched in this Trial 6 campaign (this package, recurring-calendar-repair, delegated-budget-repair) independently hit this identical `"__proto__"` shape-gate bug, while both Codex attempts (route-policy-repair, browser-replay-repair) reached clean checker passes — a striking provider-correlated split this round, worth watching across future trials rather than treating as proven from one campaign.

No infrastructure interruption. No additional model calls were made beyond this one authorized attempt. This trial's evidence and interpretation are independent of the Trial 1/2/3/4/5 sections above, which used earlier task versions, grading revisions, or providers; do not alter or reinterpret those earlier sections.


## Round 5 preparation — historical Trial 7 (September 11, 2026)

The preceding Round 4 / historical Trial 6 reward 0 remains counted. This package’s export is byte-identical to the last trial.

The next attempt is prepared on **Claude**, the same provider as Round 4, using **coverage-v2**. All five tasks launch concurrently into fresh blind workspaces. Round 5 is the fifth campaign on public 3.0.0 and historical Trial 7 in this document. Preparation itself makes no model call and contributes no outcome.

[Coverage and counting report](../browser-coverage-v3-2026-09-11.md) · [Counting disposition](../evidence/2026-09-11-browser-round-four-disposition.json) · [Round 5 handoff](../../../docs/hardened-next-five-trial-five-handoff.md).


## Conditional continuation after Round 5 — prepared September 11, 2026

The user authorized continuing after new reward-zero results, stopping this task on its next pass or at six counted trials with three Codex and three Claude. The already-running Round 5 is unchanged and must finish before the continuation starts. The [explicit counting ledger](../evidence/2026-09-11-hardened-six-counting-ledger.json) records the previously documented first-round regrades and retains excluded attempts separately; preparation adds no trial result. See the [remaining-slot plan](../hardened-six-continuation-preparation-2026-09-11.md) and [operator handoff](../../../docs/hardened-six-continuation-handoff.md).

## Round 5 and continuation — historical Trials 7-8 — 3.0.0 — September 11, 2026

Both solvers were blind to all previous submissions, grades, reference solutions, analysis docs, and to each other's attempt. Private coverage-v2, unchanged from Round 4. Package digest `2a51be6fc49db809f3c59151526cd6fe97acd9c9a83216ab8842d55f390771f2` (unchanged), profile digest `d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794` (requested `anthropic/claude-opus-5`, effort `max`, via Claude Code, same provider as Round 4) for both attempts. Runtime: byte-identical copy of the completed Round 4 frozen runtime (source digest `597df061330dad6fc300dc1bf12fdbc12d29817b1e6d58c80732fc4dea71accc`), not rebuilt.

**T7 — historical Trial 7 (Round 5).** Job id `workflow-authority-repair-attempt-1`, campaign `.local/hardened-next-five-trial-five-2026-09-11/`. Dispatched 2026-09-11T08:20:45.072Z, completed 2026-09-11T08:47:12.843Z (26m28s wall; 1,566,159ms / 26m06s authoring). Usage: 4,916,771 input tokens (4,754,167 cached), 135,202 output tokens, $7.383879 (subscription billing). Reward **0**. Service semantic-pass, 36/36. Checker: shape-gate failure. `grading/checker-grade/cases/cases.json` lists 16 opaque tokens including the literal `"__proto__"`; the actual `checker-process.log` output has only 15 of those 16 keys, missing `"__proto__"`. The submitted `checker.mjs` builds `const verdicts = {}` (line 432) and assigns per candidate via bracket notation, `verdicts[token] = evaluateCase(entry)` (line 437) — a plain object cannot hold an own `"__proto__"` property through bracket assignment, so that candidate's verdict silently vanishes from the output and the harness's exact-key-count shape gate rejects the whole result. This package's checker has shown this same bug class before, in its own Round 4/Trial 6 attempt, alongside two other genuinely distinct defects in earlier rounds — a recurring risk for this package, not a deterministic one.

**T8 — historical Trial 8 (Round 6 continuation), user-authorized follow-up since T7 failed.** Job id `workflow-authority-repair-attempt-1`, campaign `.local/hardened-six-continuation-2026-09-11/slots/workflow-authority-repair/trial-8/`. Same provider/profile as T7. Dispatched immediately on T7's failure, completed 2026-09-11T09:17:45.912Z (1,599,954ms / 26m40s authoring). Usage: 8,460,406 input tokens (8,282,972 cached), 134,780 output tokens, $9.285746 (subscription billing). Reward **0**. Service semantic-pass, 36/36. Checker: the same shape-gate bug class, independently confirmed — 16 expected tokens, 15 actual, missing `"__proto__"`. This is a distinct implementation from T7's: `const verdicts = {}` (line 573) and `verdicts[key] = ...` (line 604) — different variable name, different line numbers, same underlying plain-object-as-opaque-token-dictionary mistake.

Both completion manifests independently re-verified via `verifyEvidence` this session: T7 921 files, T8 945 files, all hashes match, no infrastructure error.

**Final disposition.** With T8's failure, this task reached the six-counted-trial stop condition automatically (per the user's explicit continuation rule: continue after clean reward-zero results until six counted trials with three Codex and three Claude): final tally **6 scored, 6 failures, providers 3 Codex + 3 Claude**, `stopReason: "six-counted"`, 0 unused slots. This is a complete, balanced six-trial record meeting the ≥5/6 target with room to spare.

No infrastructure interruption on either attempt. This trial's evidence and interpretation are independent of the earlier Trial 1-6/audit sections above, which used earlier task versions, grading revisions, or occurred before these specific attempts; do not alter or reinterpret those earlier sections.
