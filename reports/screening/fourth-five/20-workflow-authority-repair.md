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
