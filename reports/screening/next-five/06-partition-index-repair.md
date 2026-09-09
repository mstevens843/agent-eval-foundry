# 06 — Partition index repair

Completed one Codex attempt, requested gpt-5.6-sol / xhigh. Reward **1**. Authoring **18m 48s**; service **17/17** scenarios; checker **12/12** candidates, including both correct implementations and all ten negative controls with the required labels.

## What the task was, in plain English

Repair a search-index consumer that receives callbacks out of order while ownership of partitions changes. Seeing offset 9 does not mean offsets 0–8 have finished. Likewise, a late callback must not overwrite a newer document version, and an old owner cannot act after its generation is replaced. The service must finish every required position without skipping work or changing unrelated partitions.

## What was in the frozen package

Four service modules (consumer, index, ownership and progress), two visible test files, a typed API, instruction.md, SEMANTICS.md and CHECKER-INPUT.md. Hidden service grading covered 17 scenarios and six obligations: completion, index_payload, version_order, ownership, checkpoint_prefix and preservation. The separate checker exercise used two correct implementations and ten incorrect controls.

The submitted checker had to judge actual traces and state without precomputed expected answers. The grader collected service effects through the protected authority-process route; candidate diagnostics were not ground truth.

## Concrete repair, compared with the starter

- index.mjs gained an authoritative read and skipped a write when the stored version was already equal or newer. This prevents version regression while allowing the consumer to complete the older event.
- progress.mjs replaced Math.max(previous, incomingOffset) with per-partition completed-position sets. It advances only while the next contiguous position is present, retaining completion across ownership-generation changes.
- Existing consumer/ownership modules were left unchanged. The repair was concentrated in two small modules; the standalone checker was the larger new deliverable.

## What the agent did and what grading observed

The task combines version-safe indexing, partition-qualified identity, ownership generations and contiguous completion checkpoints. Codex read the public contract and existing tests, changed src/index.mjs and src/progress.mjs, and added checker.mjs. The recorded 17 shell commands include repeated npm tests, syntax checks, handcrafted good/bad traces, and a generated 200-cell exercise for its checker. Its generated harness reconstructed API observations and state, so checking did not depend on a hidden answer key.

The implementation preserved greater stored versions, tracked completion before committing a contiguous prefix, and kept partition ownership separate from business versions. The independent grading route accepted every service scenario. The checker independently recognized early completion, stale ownership, cross-partition state, incorrect version replacement, no-work and forged-completion controls.

This is a real successful solve, not a desired benchmark failure. One successful run does not prove every future version is easy, but this construction did not challenge this run for the proposed three-hour budget.

## What to improve next

First inspect additional contract-valid cases against this preserved submission. Keep correct alternatives and the same positive-work requirements. The observable gap is not missing effort: the agent built its own simulated host and targeted mutations successfully. More seeds or merely more callbacks are weak hardness arguments.

A substantial successor could require coordinated ownership transfer, durable recovery and externally observed checkpoint/effect ordering across multiple components, **only** with a coherent public contract and attainable recovery path. That is new construction, not a hidden-suite edit silently credited to this version. Maintain causal separation of event identity, ownership generation, business version and committed prefix. Do not prescribe a particular algorithm.


## Evidence and publication limits

[Sanitized trial record](../evidence/2026-09-08-next-five.json) includes package/profile hashes, submitted-file deltas, observed settings, independent service and checker counts, and hashes of the retained completion manifest and grade. All files listed by that manifest were hash-verified during publication. [Batch index](../README.md) explains the evidence boundary.

The raw transcript and full submitted workspace remain in restricted local storage; this is an editorial analysis of the recorded actions and artifacts, not a publication of private internal reasoning or independently blind-adjudicated evidence. The current [task source](../../../tasks/partition-index-repair/) may have a different build identity. Suggestions are for a new version, not changes to the original result. Self-authored tests, independent service scenarios and checker candidates have different denominators.

## Changes applied since this trial (2026-09-08)

No fix specific to this package was needed from the reasons-formatting review round — this trial already scored reward **1** with every control correctly named. Two harness-level changes did land in the working `.local/post-program/next-five/2026-09-07-p09/source` tree afterward (see [causal-replica-repair](07-causal-replica-repair.md) and [partial-release-repair](08-partial-release-repair.md)): a fix accepting explanatory-prefix `reasons` strings, and an additive, currently-inert positive-candidate-bank-widening mechanism unused by this package. Neither changed this package's scenarios, controls or reference implementation.

**An unrelated finding surfaced while regrading.** Re-running this trial's already-preserved checker.mjs against the current package (zero new model calls) now fails, rejecting both correct reference implementations it previously accepted. Investigated directly: the checker's own code emits bare, exact check-id strings with no explanatory prefix, so this is **not** a reasons-formatting artifact and not caused by the harness fixes above. The package this checker is now graded against no longer matches the one this trial saw — a divergence that predates this review round and was already disclosed separately as an earlier, independent scenario-content fix.

**Practical implication.** The reward **1** and "full service and checker solve" evidence above remain accurate for the package as it existed at trial time, but should not be read as still-current evidence about today's version of this package. Full numbers: restricted regrade record `regrade-2026-09-08.json` (restricted local storage, same evidence boundary as the sanitized trial record above).

**When trials run again:** treat a new partition-index-repair attempt as a first read on the current package, not a replication of this one.


## Trial 2 preparation — fourth ranked group (2026-09-09)

**Ready for second exploratory trials through Foundry or native Harbor.** No new model attempt is recorded by this engineering work. Removed the public consumer, ownership, index and progress modules after completing the private service closures. Retained the maintained 17-scenario version and its raw event/partition inputs. The independent checker reconstructs ownership, durable versions, delivered callbacks, completed positions and committed prefixes. Both the incremental reference and the alternative that commits after draining input pass. The historical checker regrade against a different package remains a diagnostic version comparison, not a new model failure.

Both service and checker are required. The public entry is empty, reason strings are optional diagnostics, helper modules are allowed, and the contract retains the facts needed to judge correctness. Existing shared authoring-policy improvements apply; no additional exploration gates were introduced.

Local validation passed 15 assurance checks across 17 service scenarios, including complete reference/alternative services and semantic rejection of the untouched starter. The independent checker classified **12/12** candidates correctly, with zero false accepts or misses. All 22 native static checks and six verifier integrity controls passed. The exact native export earned oracle reward 1 and nop reward 0, with no infrastructure error; nop rejects the absent required checker. Foundry assurance separately verifies the empty service's semantic failure. Export reproduction and targeted regression checks passed.

Foundry export: `.local/fourth-ranked-five-implementation-2026-09-09/release-ready/partition-index-repair/export`. Package digest: `9447162fe6bc8d6e1ba8f421b9c82f2a91f80e693891e7be1f282e5cd055ffb9`. Native digest: `12cd6b995d909f5f7b4ed97fe188f8bfd0a1a68b8f6f8838565e4be7cfe50669`. Suggested Trial 2 target: **Codex**, retaining this package's original model family. Append the eventual Trial 2 result below this engineering record, preserving Trial 1.

[Group implementation and selection](../fourth-ranked-five-implementation-plan-2026-09-09.md) and [exact validation evidence](../evidence/2026-09-09-fourth-ranked-five-implementation.json) retain file hashes, native trial identities and the remaining final-qualification requirements.
