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

## September 9 implementation successor — ready for exploratory trials

The contract specifies final causal state and retained observation clocks, with no requirement to write redundantly to every replica. The contradictory deleted-document gloss is removed; missing-document semantics remain explicit. Identity handling, snapshot collection, merge and writes are no longer supplied in the starter.

Both deliverables now have complete private oracle implementations. The public service
starts from an empty entry point. The checker classifies every supplied case with a
Boolean verdict; optional reasons are ungraded diagnostics, and helper modules are
allowed. Original results above remain historical; no second model trial was run.

Executed validation on this successor:

- Service oracle: 33/33 scenarios; checker oracle: 11/11 candidates.
- Protected Foundry assurance: 14 operations passed; deterministic rebuild and
  exported-CLI recipient reproduction passed, including drift and invalid-execution checks.
- Native Harbor oracle reward 1; native nop reward 0; no Harbor exceptions.
- All 22 pinned upstream static checks and all six local checker/integrity controls passed.
  These local controls are not the official model-powered cheat qualification trials.

Canonical source: `tasks/causal-replica-repair`. Native export:
`.local/top-five-implementation-2026-09-09/harbor-ready/causal-replica-repair`.

Native export digest: `6167354e302ce2a36e8af16248350da9a4f4e252fb1c66fef766f5c65e456ef5`.
Foundry package digest: `dd9d140e1cda83fc41fc86cd17b5522f4020b406075728892133b7e4ba0a3eea`.

[Versioned evidence](../evidence/2026-09-09-top-five-implementation.json) records source
hashes, logs, per-check CTRF results and both package identities. The
[shared implementation record](../top-five-implementation-plan-2026-09-09.md) explains
policy and tooling changes. Use these maintained sources or the identified exports
for the next trial, rather than the older local successor copies named above.

Readiness means engineering readiness for exploration. Removing supplied implementation
code changes the difficulty hypothesis and invalidates any attempt to reuse earlier
model results as qualification for this version. Fresh model evidence is still needed.
The eventual chosen submission also needs human-authored reviewer material and the
required rubric, standard and cheat qualification runs; those requirements do not
justify delaying exploration to qualify all five candidates.

## Trial 2 — implementation successor — September 9, 2026

### Identity and execution

Run `causal-replica-repair-attempt-1`, package digest
`dd9d140e1cda83fc41fc86cd17b5522f4020b406075728892133b7e4ba0a3eea`. Requested target **codex**,
`openai/gpt-5.6-sol`, effort `xhigh`. Frozen execution source:
`2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4`.
The pinned author image was
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`.

Started `2026-09-09T11:35:50.888Z`, completed `2026-09-09T11:49:36.335Z`.
One of exactly five fresh campaign attempts, reserved within **232 ms** and reported
running concurrently by the dispatching agent's `docker ps` observation. Budget:
10,800 seconds, 2 CPUs, 2 GiB; signed subscription-only authorization, one attempt,
no automatic retries or recorded paid-API fallback. No timeout is recorded.
Requested settings are not runtime attestations: Claude model strings were observed;
Codex model identity and effort/scaffold versions were unobservable in the captures.
CLI dollar estimates are not subscription charges.

### Changes and results

The four public implementation modules were replaced with an empty entry point.
The final-state requirement was clarified to allow legitimate alternatives without
redundant writes and to preserve nonzero observation clocks when no siblings remain.
The checker remains required, as it was in Trial 1; only its Boolean verdict is now
graded. Reason text is diagnostic-only.

**Reward 1. Service 33/33; checker 11/11.** Both valid implementations were accepted
and all nine defective candidates rejected. No missing or unexpected scenario IDs,
timeout or infrastructure error is recorded.

The capture analysis records a shared `reconciliation.mjs` implementation, repeated
syntax/test checks and two recovered patch-context failures. The final completion
claim matches the observed service/checker suite passes. Those passes establish the
measured result, rather than universal correctness.

### Comparison and decision

Trial 1 passed the service but its checker rejected a valid alternative by requiring
redundant writes. That earlier report retains its original assessment. Trial 2 passes
both dimensions after wording and starter changes; one new attempt cannot isolate
which change caused the difference. Authoring was about 13m38s versus 11m21s in Trial 1.

Lower this package's immediate priority in the search for repeatable failures. A
clean solver pass is not evidence that the package meets a failure-based qualification
bar. No formal qualification or new trial is authorized by this analysis.

### Evidence and qualification boundary

The publication audit checked **777 manifest-listed files**
for this record with zero mismatches and compared all four supplied contract/interface
files against the frozen export. Raw evidence remains at
`.local/round-two-top-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/causal-replica-repair-attempt-1/`.
The earlier Trial 1 text and dated engineering additions above are preserved.

[Campaign results and audited decisions](../round-two-top-five-2026-09-09.md) ·
[Sanitized trial evidence](../evidence/2026-09-09-round-two-top-five.json) ·
[Integrity and diagnostic evidence](../evidence/2026-09-09-round-two-top-five-audit.json).

This is an exploratory repository assessment. The immutable result still records
`adjudication: unlabelled`, `modelEvidenceEligible: false` and
`countsAsModelFailure: false`; publication does not change those fields or claim
six standard failures, official cheat qualification or independent blind review.
