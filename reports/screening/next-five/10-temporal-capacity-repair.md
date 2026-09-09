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

## Trial 3 — repeat attempt — September 9, 2026

### A. Identity and execution

Run `temporal-capacity-repair-attempt-1` in the fresh `round-three-failing-five`
campaign slot, package digest `05f7f231c38cd9c0242bb58543a92a888375f114a29ff1caeb4e42a893011ede`
— byte-identical to Trial 2's package — route `professional-multifile/authority-process@1`.
Evidence retained at
`.local/round-three-failing-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/temporal-capacity-repair-attempt-1/`.
Dispatched under a fresh signed JobStore reservation (Ed25519, `realm: real-provider`,
`billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`) — `attempt-1` in
this campaign's own store, not a resume of Trial 2. Runtime: the same isolated
`frozen-source` build used throughout this session, re-verified byte-identical
immediately before this dispatch.

Target: **claude**, same provider as Trial 2. Requested `anthropic/claude-opus-5`,
effort `max`, CLI `scaffoldVersion 2.1.263`. Observed: `model="claude-opus-5"`
(matches requested); effort and scaffold version remain unobserved. The controller
verified the profile digest and instruction hash were identical to the Trial 2
record before dispatching, and the solver received only the original public task
inputs — no prior submission, analysis, or this handoff.

Dispatched 2026-09-09T19:02:12.845Z as one of five reservations installed within a
217ms window (19:02:12.628Z–19:02:12.845Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently. Completed 2026-09-09T19:19:05.104Z.
Total elapsed ≈1,012,259ms (~16m52s) — authoring ≈1,002,304ms (~16m42s), grading
≈10.0s. Token usage: 3,049,074 input tokens (2,942,313 cached), 80,017 output,
`total_cost_usd` $4.54 — a CLI price estimate, not a charge, under the
subscription-only reservation. Execution reached a clean `completed` state with no
invalid-execution or infrastructure error.

### B. Results

**Reward 1 — a clean pass on both dimensions, resolving Trial 2's reward-zero.**
Service: 34/34 scenarios pass, zero failures (fully correct, matching Trial 2's
also-fully-correct service). Checker: `checkerRequired: true`, `checkerPassed: true`,
13/13 candidates correctly classified — 0 missed, 0 false positives. This checker
catches `unread-empty-source`, the exact candidate Trial 2's checker let through.

### C. Comparison with Trial 2 and recurrence assessment

**Trial 2's specific defect did not recur.** Trial 2's `paginationViolation()` only
flagged "never fetched the source" when `recordCount > 0`, exempting exactly the
zero-record, no-fetch case. This Trial 3 submission's equivalent check, in
`judgeCell()`, is unconditional:

```js
if (observations.length > 0 && streamLooksComplete(observations)) {
  if (fetches.length === 0) {
    reasons.push('no fetch call was observed, so the history was never read');
  } else { ... }
}
```

There is no `recordCount`/total-based exemption anywhere in this logic — it flags a
missing fetch whenever the observation stream looks complete, regardless of how many
records existed or what the resulting total was. It also independently defends
against the *opposite* risk (a truncated observation log being misread as proof
nothing happened) via `streamLooksComplete()`, a distinct design choice not present
in Trial 2's code at all.

This attempt avoided Trial 2's checker mistake. The different outcome is
useful evidence about variation between attempts, but two runs cannot establish
that the earlier failure was rare, one-off or a reliable capability limit. The
literal zero streak ends; Trial 2's failure remains in the six-attempt record.

### D. Observable solving behavior

The submission's own test suite includes `test('checker uses publicInput, including
records the run never fetched', ...)`, which passed — i.e., the agent specifically
authored and ran a test naming this exact scenario class (records present in
`publicInput` that the run never fetched), and its checker design held up against it.
Capture also shows explicit reasoning recorded inline: *"a filtered or truncated
observation log shouldn't be read as proof a page was never fetched"* — the rationale
behind `streamLooksComplete()`. Unlike Trial 2's transcript (which tested its
pagination audit "and its conservatism" but never constructed the zero-record
instance), this run's self-testing directly named and exercised the never-fetched
condition as a first-class case, which plausibly explains why it did not repeat
Trial 2's specific miss.

### E. Next step

Retest the unchanged package on Claude. The package has one failure and one pass,
so it remains within the reported 5-of-6 threshold and needs four failures from
the remaining four attempts. Evaluate the complete task, including its required
checker; a correct service does not cancel a checker failure.

### Acceptance progress and next prepared attempt

This unchanged successor has **1 failure and 1 solver pass in two scored attempts**, both on Claude. The user reports that the CEO accepts at least **five failures out of six**, with three attempts per provider; six consecutive failures is the stricter aspiration, not the acceptance threshold. This package remains within that threshold and needs **4 failures from the remaining four attempts**. Different failure mechanisms can count; no identical-bug requirement is added.

The next attempt is **Trial 4 in this document, the third attempt on this successor**, using the same provider, package and saved profile again. Afterward, this package will have three runs on its original provider and will need three on the other provider. [Prepared Trial 4 handoff](../../../docs/round-four-failing-five-handoff.md). Preparation launches no model calls.

## Trial 4 — third unchanged-successor attempt — September 9, 2026

### A. Identity and execution

Run `temporal-capacity-repair-attempt-1` in the fresh `round-four-failing-five`
campaign slot, package digest `05f7f231c38cd9c0242bb58543a92a888375f114a29ff1caeb4e42a893011ede`
— byte-identical to Trial 2 and Trial 3's package — route
`professional-multifile/authority-process@1`. Evidence retained at
`.local/round-four-failing-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/temporal-capacity-repair-attempt-1/`.
Dispatched under a fresh signed JobStore reservation (Ed25519, `realm: real-provider`,
`billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`) — `attempt-1` in
this campaign's own store. Runtime: the same isolated `frozen-source` build used
throughout this session, re-verified byte-identical immediately before this
dispatch; author image `sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`.

Target: **claude**, third consecutive attempt on this original provider. Requested
`anthropic/claude-opus-5`, effort `max`, CLI `scaffoldVersion 2.1.263`. The controller
hard-asserted the profile digest and instruction hash were identical to the Trial 2/3
record before dispatching, and the solver received only the original public task
inputs — no prior submission, analysis, or this handoff.

Dispatched 2026-09-09T19:56:47.080Z as one of five reservations installed within a
223ms window; `docker ps` confirmed all five `foundry-real-*` containers running
concurrently. Completed 2026-09-09T20:12:32.627Z. Total elapsed ≈945,547ms
(~15m46s), well under the 10,800s (3h) cap. Token usage: 2,739,579 input tokens
(2,647,513 cached), 75,200 output, `total_cost_usd` $4.13 — a CLI price estimate,
not a charge, under the subscription-only reservation. Execution reached a clean
`completed` state with no invalid-execution or infrastructure error.

Completion manifest: 864 files, 5,129,655 bytes, all hash-verified with zero errors
this session. `completionSha256` `efdb3903eb6120c1b90a1515b80f2c6e5d5e23ffaa0e8ad32ab20f24f943d859`,
`resultSha256` `95668ae819f500851968cadc7a6d1af495634642c5c9a8772848f43edf4815b9`,
`gradeSha256` `986881fbcb08e757e0d87e279eb272e31502ba499badfef41ae3d53f5d50aaef`.

### B. Results

**Reward 0 — the checker-only failure recurs, service still fully correct.**
Service: 34/34 scenarios pass, zero failures (matching Trial 2 and Trial 3, both
also fully correct). Checker: 12/13 candidates correctly classified, 0 false
positives, 1 missed — `unread-empty-source`, `expectedFailingCheck: completion`.
Both `reference` and `alternative` known-good candidates were correctly accepted.
This is the exact same named candidate Trial 2's checker missed. Trial 3, in
between, caught it and passed cleanly (reward 1) — the pattern across three
attempts on this provider is **fail → pass → fail**, not a clean streak.

### C. Code-level recurrence assessment: same candidate, a different and more fundamental gap

Reading all three submitted `checker.mjs` files shows this is **not** the same
mechanism recurring — it is a structurally different gap that happens to miss the
identical named candidate.

Trial 2's checker had an explicit pagination/fetch-completeness check with a
narrow, targeted exemption:
```js
if (fetches.length === 0) {
  return queryCount > 0 && recordCount > 0 ? 'no page was ever fetched, so the revision log was never read' : null;
}
```
It checked for fetches, but only flagged the omission when `recordCount > 0` —
missing exactly the zero-record case.

Trial 3's checker fixed that by making the same kind of check unconditional
(`observations.length > 0 && streamLooksComplete(observations)` → flag a missing
fetch regardless of record count), plus added its own defense against the
opposite risk (a truncated log misread as "never fetched").

**Trial 4's checker contains no fetch/pagination-completeness check of any kind.**
Its `judgeCell()` (lines 62–140) never inspects `cell.observations` for `fetch`
calls at all — the only observation-derived signal it reads is `record`
acknowledgments (`acknowledgedRecords()`, lines 38–50), used solely to detect
duplicate/extra writes. Ground truth (`expected`) is computed directly from the
full `publicInput.records`/`queries` via `computeTotals()`, and every candidate is
judged purely by whether its persisted totals match that computed value — never by
whether it actually read the source. For `unread-empty-source` specifically,
records is empty, so the computed expected total is trivially correct regardless
of whether any fetch occurred, and nothing in this checker's logic asks the
question "did the candidate read the source" at all. Other negative candidates
(e.g. `no-work`, correctly rejected here) are caught only because skipping the
work also produces a *wrong total* on non-empty inputs — an incidental catch, not
a deliberate pagination check.

So Trial 2's gap was a narrow exemption inside an existing structural check; Trial
4's gap is the absence of any structural check on the source-traversal obligation
at all, substituted entirely by outcome-only verification. Both independently
converge on missing the same named candidate because both, for different reasons,
never ask the process question `SEMANTICS.md`'s "Exhaust all pages" requires —
Trial 3 is the one submission of three that added an explicit process check. Two
of three independent Claude/max attempts have now failed this exact required
control via two different code paths; that is meaningful recurrence evidence at
the level of "which named obligation keeps getting missed," even though it is not
evidence of one recurring bug.

### D. Progress toward the reported five-of-six acceptance threshold

This package now has **2 failures and 1 pass across its first 3 (Claude) attempts** —
fail (Trial 2), pass (Trial 3), fail (Trial 4). The user reports the CEO accepts at
least **five failures out of six** with three Claude and three Codex attempts per
package. Arithmetic: 2 failures banked; the remaining 3 attempts are all Codex, and
**all three must fail** to reach 5-of-6 (2 + 3 = 5). If even one of the three
remaining Codex attempts passes, the maximum reachable is 2 + 2 = 4, below
threshold. Unlike `incremental-build-repair`, `issued-report-repair` and
`variant-cache-repair` (each now at a clean 3/3 same-provider failure streak), this
package's non-monotonic fail→pass→fail history means it cannot be described as
having "three consecutive zeroes" — Trial 3 broke the streak before Trial 4
restored a failure, so its six-run record so far is less uniform evidence than the
other three packages', even though the raw failure count (2/3) is the same.

### E. Next step

The three remaining attempts on this package are Codex, not Claude — this session's
own Trial 4 authorization was same-provider only (three Claude, two Codex across
the batch) and does not launch those opposite-provider runs. Evaluate the complete
task, including its required checker, on any future attempt; a correct service does
not cancel a checker failure. Keep the raw fail→pass→fail history intact rather than
normalizing it to a streak.

### Next batch prepared — September 9, 2026

This package continues at **2/3 failures**. Its
three Claude attempts are complete. The user authorized the next attempt on
**Codex**, using the exact same package and grading. This is **Trial 5**
in this history, the fourth attempt on the unchanged successor and the first
with the opposite provider. It runs concurrently with the other three continuing
packages. The remaining three provider slots need all three failures to
reach 5/6; only the first of those slots is prepared for this launch.

[Prepared controller and handoff](../../../docs/round-five-continuing-four-handoff.md).
No new model attempt was launched during preparation. Different valid failure
mechanisms and required-checker-only failures can count; the provider switch
does not reset or discard the existing results.
