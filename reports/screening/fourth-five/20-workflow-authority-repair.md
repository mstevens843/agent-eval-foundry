# 20 — Workflow authority repair

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
