# 07 — Causal replica repair

Completed one Codex attempt, requested gpt-5.6-sol / xhigh. Recorded reward **0**. Authoring **11m 21s**; service **33/33** scenarios; checker **10/11** candidates. The sole misclassification was rejecting the correct alternative. No incorrect candidate escaped.

## What the task was, in plain English

Repair a service that merges document edits from replicas that worked offline. Each edit has an identity separate from its payload, and each replica records which edit identities it has already observed. An absent edit may mean “never seen” or “seen and deleted”—those cannot be treated the same. Correct merging keeps genuine concurrent edits, preserves evidence of removals, and leaves unrelated documents alone.

## What was in the frozen package

Four service modules (identity, merge, snapshot and service), two visible test files and a full public API/semantics/checker contract. Service grading used 33 scenarios and four obligations: completion, causal_values, causal_context and preservation. Checker grading included a reference, an outcome-equivalent alternative and nine negative controls, including resurrection, lost context, lost siblings and unwanted writes.

The alternative implementation is important: it writes only documents that actually need updating. The checker must accept legal implementations with different operation counts and representations.

## Concrete repair, compared with the starter

- merge.mjs stopped taking the union of every visible value. An edit now survives only when each participating replica either contains it or has not yet observed it.
- identity.mjs retained the componentwise maximum observation clock and added safe own-property handling for site identifiers.
- service.mjs used own-property checks when selecting document snapshots so missing documents map to an empty state.
- The service still wrote every scoped result; its checker then incorrectly elevated that implementation choice into a requirement for every other candidate.

## What the agent did and what grading observed

Codex fixed identity handling, causal merge and service orchestration, and wrote a standalone checker. Its 12 recorded shell commands include existing tests, syntax checks and handcrafted reconciliation/checker examples. The service correctly retains concurrent identities, preserves deletion context, reconciles requested documents and avoids unrelated changes.

The checker adds a stronger requirement than the outcome contract needs: for every scoped replica/document pair it requires both an actual replacement request and a materialized final state. See submitted checker.mjs around the wasWritten test. The accepted alternative skips redundant writes and treats a missing document as the empty state.

A concrete preserved witness is alternative case-017. The south and west archive documents already have context {author:3} and no values. Leaving them alone is correct. The scoped new document is missing everywhere and therefore empty under SEMANTICS.md. The alternative does not issue pointless writes or materialize those empty documents. All authoritative checks pass, but Codex's checker returns completion failure.

## Interpretation

This is a **checker overconstraint**, not inability to solve causal reconciliation and not failure to detect a bad merge. The public contract permits any valid strategy, treats missing documents as empty and requires accepting correct alternatives. Its phrase “reconciled onto every replica” should nevertheless be clarified in the next revision to avoid suggesting that writes themselves are mandatory.

The mechanism is useful as a hypothesis: an agent can implement correct outcomes yet make its self-check reject outcome-equivalent implementations. This single, non-blind result is not conclusive model-family evidence.

## What to improve next

Keep alternative-correct controls that vary unnecessary writes, value order, zero clocks and representation. Add near-correct mutations for real loss of observations rather than requiring a trace shape. If increasing difficulty, introduce genuine bounded multi-stage reconciliation with attainable authority and explicit ownership of snapshots; do not add arbitrary outbox failures to this family.

Do not claim the service failed or that an append-only audit defect was reproduced. Neither occurred here.


## Evidence and publication limits

[Sanitized trial record](../evidence/2026-09-08-next-five.json) includes package/profile hashes, submitted-file deltas, observed settings, independent service and checker counts, and hashes of the retained completion manifest and grade. All files listed by that manifest were hash-verified during publication. [Batch index](../README.md) explains the evidence boundary.

The raw transcript and full submitted workspace remain in restricted local storage; this is an editorial analysis of the recorded actions and artifacts, not a publication of private internal reasoning or independently blind-adjudicated evidence. The current [task source](../../../tasks/causal-replica-repair/) may have a different build identity. Suggestions are for a new version, not changes to the original result. Self-authored tests, independent service scenarios and checker candidates have different denominators.

## Changes applied since this trial (2026-09-08)

Two separate things changed after this write-up, for two separate reasons, in the working `.local/post-program/next-five/2026-09-07-p09/source` tree — not in this repo's root-level [task source](../../../tasks/causal-replica-repair/), which already carries its own separate build identity. Neither retroactively alters the reward **0** recorded above.

**1. The exact defect this report identifies — the "reconciled onto every replica" phrase — was fixed.** SEMANTICS.md and instruction.md previously read as if `api.replace` were mandatory for every scoped replica/document pair. Both were reworded to state explicitly that this is an outcome requirement — final stored state must equal the reconciled result — and that a replica already holding that state needs no further write. The grading logic itself (`completion`) was **not** touched; it already graded on outcome. Only the human-readable contract text changed.

**2. A separate, harness-level fairness bug was found and fixed, but does not help this specific submission.** An unrelated real trial (partial-release-repair, see [08](08-partial-release-repair.md)) surfaced that the checker grader required a submitted checker's `reasons` entries to be a bare, exact check-id string, rejecting a checker whose reasons instead read `"checkId: explanation"`. Fixed harness-wide. This does **not** change this package's outcome: the preserved checker.mjs from this trial fails because its own code independently requires an actual `api.replace` call and materialized state for every scoped pair — a bug in that specific submitted file's logic, not in how reasons are read.

**Free regrade (zero new model calls).** The already-preserved checker.mjs from this trial was re-run against the fixed harness: still fails, for exactly the reason above — the spec-wording fix protects a future checker author from making the same mistake; it cannot rewrite an already-submitted implementation. Full numbers and root-cause analysis: restricted regrade record `regrade-2026-09-08.json` (restricted local storage, same evidence boundary as the raw campaign records above).

**When trials run again:** a fresh causal-replica-repair attempt should be judged against the corrected SEMANTICS.md/instruction.md wording; whether a new checker still over-constrains "reconciled onto every replica" despite the clarified text is the open question this next attempt should answer.
