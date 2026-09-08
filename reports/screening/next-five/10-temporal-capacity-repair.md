# 10 — Temporal capacity repair

Completed one Claude attempt, requested Opus 5 / max. Reward **1**. Authoring **11m 27s**; service **33/33** scenarios; checker **12/12** candidates, including all ten required negative-control labels.

## What the task was, in plain English

Repair a historical capacity report. Records have both an effective interval and a time when that revision became known. For each query, select the newest revision known at its cutoff, then integrate that revision's value over the requested interval. A later revision can move the interval elsewhere or retract the entire record. The service must not resurrect an older overlapping version, lose integer precision or omit zero-valued requested reports.

## What was in the frozen package

Four modules (pages, revisions, integral and service), two visible test files, typed interfaces and the public instruction/semantics/checker contract. The package bounds records to 200, queries to 20 and pages to 50. Intervals are integer and half-open; values are decimal integer strings that can exceed JavaScript Number precision.

Hidden service grading covered 33 scenarios and completion, exact_integral, population and unique_reports. The checker exercise used two correct implementations and ten controls, including future revisions, wrong cutoff inclusivity, premature effective-time filtering, floating-point totals and duplicate/extra reports.

## Concrete repair, compared with the starter

Revision selection was performed by matching series/key and knowledge cutoff before interval overlap. Null revisions retract a key rather than reviving an older version. Integration clipped half-open intervals and used BigInt multiplication and addition, emitting exact decimal strings. The service exhausted pages and persisted exactly one result for every requested query, including zero totals.

## What the agent did and what grading observed

The task combines knowledge-time revision selection, effective-time intervals, tenant/resource identity, complete query population and exact totals. Claude changed pages, revisions, integral and service modules, added checker.mjs and a semantics test.

The repaired service selects the applicable revision before integration, reads the complete population and records exactly one report per requested query. Its integral keeps products and sums in BigInt, uses bounded integer interval widths, and emits a decimal string. This directly addresses precision loss without an expensive or unusual algorithm.

The record contains 23 Bash calls, three Edit calls, two Read calls and five Write calls. The agent ran existing/new tests and authored validation scripts for the checker, including malformed-input checks. Both service outcomes and alternative-correct checker acceptance passed independent grading.

## Interpretation and next construction

This version reduces to accessible data selection, exact interval arithmetic and complete reporting. The trial supports that these obligations were manageable for this agent; it does not establish a model gap.

More records, bigger integers or extra prose would not by themselves make a substantial successor. More promising work would combine genuinely distinct authoritative feeds and explicitly defined correction attribution across historical reports, while retaining exact business definitions and an efficient expert solution. Check portfolio overlap first: analytical reconciliation already addresses cross-system population meaning.

Do not force a particular data structure, ban BigInt, or introduce undisclosed time semantics. Any strengthened verifier must distinguish wrong population from correct totals, and must accept mathematically equivalent exact implementations. Reuse independent population checks and alternative-correct candidates as infrastructure rather than treating them as proof of hardness.


## Evidence and publication limits

[Sanitized trial record](../evidence/2026-09-08-next-five.json) includes package/profile hashes, submitted-file deltas, observed settings, independent service and checker counts, and hashes of the retained completion manifest and grade. All files listed by that manifest were hash-verified during publication. [Batch index](../README.md) explains the evidence boundary.

The raw transcript and full submitted workspace remain in restricted local storage; this is an editorial analysis of the recorded actions and artifacts, not a publication of private internal reasoning or independently blind-adjudicated evidence. The current [task source](../../../tasks/temporal-capacity-repair/) may have a different build identity. Suggestions are for a new version, not changes to the original result. Self-authored tests, independent service scenarios and checker candidates have different denominators.

## Changes applied since this trial (2026-09-08)

This trial already scored reward **1** with every control correctly named, so no package-specific repair was needed here. A shared harness fix landed afterward in the working `.local/post-program/next-five/2026-09-07-p09/source` tree, after a sibling trial (see [08-partial-release-repair](08-partial-release-repair.md)) surfaced that the checker grader required a bare, exact check-id string in `reasons`, wrongly rejecting checkers that instead wrote `"checkId: explanation"`. No scenario, control or reference file belonging to this package was touched.

**Regrade confirms no regression.** This trial's already-preserved checker.mjs was re-run against the fixed harness with zero new model calls: still a full pass (12/12 correct, 0 false positives, 0 missed, all 10 controls correctly named), unchanged from the original result. Full numbers: restricted regrade record `regrade-2026-09-08.json` (restricted local storage, same evidence boundary as the sanitized trial record above).

**When trials run again:** this package's grading should behave exactly as before; the fix is purely defensive against the reasons-formatting defect class observed elsewhere in this batch.
