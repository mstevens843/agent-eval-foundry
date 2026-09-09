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

## Trial 2 preparation — final group (2026-09-09)

**Ready for second exploratory trials through Foundry or native Harbor.** Removed the public pagination, revision, integral and reporting modules after completing private service closures. The independent checker derives exact integrals from original revisions and actual writes. The grader now enforces the existing requirement to exhaust the source. A new empty-source case isolates omission of the source read despite a correct zero total, for 34 scenarios.

Local validation passed **16 assurance checks**, including a semantic failure for the untouched starter. Its independent checker classifies **13/13 candidates** correctly; reason text is diagnostic. The final native export passed 22 static checks, Harbor oracle reward 1 and nop reward 0, with no infrastructure exceptions. Both export formats reproduce. No model attempt was launched by this engineering work.

Foundry export: `.local/final-five-implementation-2026-09-09/release-ready/temporal-capacity-repair/export`. Package digest: `05f7f231c38cd9c0242bb58543a92a888375f114a29ff1caeb4e42a893011ede`. Native export: `.local/final-five-implementation-2026-09-09/harbor-ready/temporal-capacity-repair`. Native digest: `6d5b00c7164f9602bc5e3ca9207924ac66650a3becff24f674589650689879a3`. Suggested target: **Claude**, retaining the original model family. Append the eventual Trial 2 outcome below this engineering record; preserve Trial 1.

[Implementation and completed checks](../final-five-implementation-plan-2026-09-09.md) · [Exact evidence](../evidence/2026-09-09-final-five-implementation.json).

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `temporal-capacity-repair-attempt-1`, package digest
`05f7f231c38cd9c0242bb58543a92a888375f114a29ff1caeb4e42a893011ede`, route
`professional-multifile/authority-process@1`. Evidence retained at
`.local/round-two-final-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/temporal-capacity-repair-attempt-1/`.
Dispatched through this session's `real-provider` execution route (signed JobStore
reservation, Ed25519, realm `real-provider`, `billingMode: subscription-only`,
`maxMicroUsd: 0`, `maxAttempts: 1`) — a fresh campaign slot (`attempt-1`), not an
infrastructure retry. Runtime: the isolated `frozen-source` build made and
independently verified earlier this session (SHA-256 re-verified unchanged
immediately before this dispatch); author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`.

Target: **claude**. Requested `anthropic/claude-opus-5`, effort `max`, CLI
`scaffoldVersion 2.1.263` (verified baked into the pinned author image). Observed
from runtime events: `model="claude-opus-5"` (matches requested); effort and
scaffold version are not exposed by the CLI's event stream and remain unobserved.

Dispatched 2026-09-09T17:31:23.192Z as one of five reservations installed within a
334ms window (17:31:23.079Z–17:31:23.413Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently, so this was a genuinely concurrent
five-way campaign. A sixth, separately-authorized job (`route-policy-repair`) was
deliberately dispatched ~102 seconds later as an additional concurrent job on this
host, reaching three Claude / three Codex attempts total this round; that job's
timing does not affect this one's own valid execution. Completed
2026-09-09T17:56:20.485Z. Total elapsed ≈1,497,293ms (~24m57s) — the longest job in
this batch — solver authoring time (capture wall clock) ≈1,487,086ms (~24m47s),
grading ≈10.2s. Token usage: 4,474,832 input tokens (4,341,069 cached), 98,816
output, `total_cost_usd` $5.98 — the CLI's own metered-price estimate for reporting
only; no actual charge occurred, since the signed authorization was
`subscription-only` with `maxMicroUsd: 0`. Execution reached a clean `completed`
state with no invalid-execution or infrastructure error.

### B. What changed since Trial 1

Per the engineering record above, the starter's pagination, revision, integral and
reporting modules were removed after completing the private service closures. The
checker remains a required, independently graded deliverable, as it was in Trial 1.
Its reason text is diagnostic-only. The engineering record explicitly flags the relevant new control: "A
new empty-source case isolates omission of the source read despite a correct zero
total, for 34 scenarios" (up from Trial 1's 33) — this is exactly the control this
trial's checker misses (see C).

### C. Results

**Foundry success: reward 0 from a substantive required-checker failure.**
The submitted service passes **34/34**
scenarios pass, zero failures, zero missing/unexpected IDs. The failure is entirely
in the submitted *checker* — 12/13 candidates correctly classified, 0 false
positives, 1 missed. The missed candidate, `unread-empty-source`, is
ground-truth-confirmed to violate the `completion` obligation (it never reads the
revision log), but the submitted `checker.mjs` returned `ok: true` for it — a real
defect the checker let through. This is the same class of failure as
`incremental-build-repair` and `snapshot-recovery-repair` earlier in this series:
correct service, incorrect required checker.

The concrete mechanical cause, from reading `checker.mjs`'s `paginationViolation()`:

```js
if (fetches.length === 0) {
  // Nothing was read, yet a non-empty log had to be read to answer anything.
  return queryCount > 0 && recordCount > 0 ? 'no page was ever fetched, so the revision log was never read' : null;
}
```

The checker only flags "never fetched" as a violation when `recordCount > 0`. Its
author's reasoning (visible in the comment) was that skipping the read is harmless
when there is nothing to read. But `recordCount` is computed from the *scenario's
actual record count* — information the checker has and a real service would not
have without reading the log. The `unread-empty-source` control is precisely the
case this gate exempts: zero records, no fetch, a correct (zero) total by
coincidence. The checker's own conservatism — designed to avoid flagging a
service for ambiguous pagination evidence — created a specific hole exactly where
the "total came out right without doing the read" defect lives.

### D. Observable solving behavior

23 `Bash` calls (per the capture) built a shared, dependency-free `capacity.mjs`
module imported by both `entry.mjs` and `checker.mjs` "so the two can never drift
apart." The agent explicitly designed and tested a self-aware pagination audit: its
own transcript states it added "the two provable pagination violations" ("no page
ever fetched" and "the cursor chain was abandoned") as an audit layer using the
`observations` input specifically because it distinguishes *how* effects were
produced from just their result, then wrote and passed 18–19 unit tests for that
audit "and its conservatism" — i.e., it deliberately tuned the check to avoid false
positives on ambiguous cases, and tested that tuning, but did not construct (or its
test oracle shared the same blind spot as) the specific zero-record/no-fetch case
that the real grading control isolates. It also ran a 400-scenario randomized
cross-check against an independent brute-force reference for the core service
logic, and caught and fixed one bug in its own throwaway smoke script (a dropped
literal), not in the submission itself. Its final claim — "Both deliverables are
done and passing" — is accurate about the service but overstates the checker: the
transcript shows deliberate, tested design of the pagination audit, not an
oversight born of no testing, yet the checker still missed a real defect its own
design choice exempted.

### E. Comparison and next step

Trial 1 returned reward 1; this version returned **reward 0**. The frozen trial includes
a concrete requirement-to-test link: frozen `SEMANTICS.md` says
**"Exhaust all pages."** In `case-033`, the negative candidate writes one zero total
without fetching the source even once. The independently collected observations
show zero fetches. Correct totals alone do not satisfy the source-traversal obligation.

An offline invocation of the unchanged submitted checker reproduced its acceptance
of `unread-empty-source`. Its `recordCount > 0` exemption is an implementation
choice absent from the contract. The checker has access to all original records;
the service cannot use that private knowledge to skip the required source read.
Reasons are diagnostic-only, so this zero does not depend on a label mismatch.

**Prioritize another trial of this unchanged package version.** The service passed
34/34 but its required checker missed a real defect, which is the Foundry's
completed-but-wrong objective. Preserve the failed checker as evidence rather than
repairing it or adding a solution hint before measuring whether the failure recurs.

### F. Verified publication record — September 9, 2026

Reward **0**; service **34/34**; checker **12/13**. All **876** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-final-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-final-five.json). Earlier trial records are preserved.
