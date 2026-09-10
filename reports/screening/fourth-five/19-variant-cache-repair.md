# 19 — Variant cache repair

> **Final counted result: 6/6 reward=0 — meets the reported ≥5/6 target.** Three Codex and three Claude trials; no slots pending. [Final results and counting method](../final-results-2026-09-09.md). The dated analysis below preserves the complete trial and grading history.

## Outcome

Claude, requested Opus 5 / max, completed in **29 minutes 6 seconds**, with **reward 1**.
Its service passed **25/25 protected scenarios**. Its standalone checker passed
**13/13 candidates**, accepting both correct implementations and rejecting all eleven
negative controls with matching reasons. Repeated judgments were deterministic and
no invalid execution was recorded.

There is also a useful limitation in the agent's own tests: its final randomized
checker sweep still reported **nine missed mutant executions** involving wildcard-entry
preservation. The original hidden bank passed; that does not mean every self-test
was clean or the checker was universally adequate.

## What the task was, in plain English

A publication service reuses responses across two edge caches and a shared shield.
The same path can have different representations depending on selected request headers.
The service must select the right representation, calculate its real age, validate it
when necessary, and apply selective purges without damaging other cached content.

Copying a response from the shield to an edge is not a new validation. Its age and
original storage time travel with it. A conditional 304 response keeps the old body
but replaces the validation metadata. No-store responses cannot be retained, and a
request explicitly requiring validation cannot simply use a fresh cache hit.

There are visible origin-request and response-byte limits. They make useful reuse part
of the product requirement; disabling the cache is not an acceptable completion path.
This is an original bounded cache API, not an assertion that every HTTP proxy must
implement this exact strategy. Different correct caching strategies remain allowed
within the published limits.

## What was in the package

The starter had entry selection, storage, resolution and service-loop modules. Public
semantics specified freshness arithmetic, variant matching, revalidation, purges and
load limits. All tiers were explicitly empty at job start. The checker received original
events, actual deliveries/counters and external observations of storage and origin calls.

The protected banks contained 25 service scenarios, two correct checker candidates
and eleven wrong-solution controls. The standalone checker had to judge real effects;
the submitted service's reports were diagnostic only. Preflight also removed dependence
on an unnecessary final read to establish completion.

## What the agent actually did

There are 36 captured shell calls. It changed four service modules, wrote a standalone
checker, and retained a `dev/` directory containing a host simulator, hand-computed
scenarios, wrong-solution variants, an oracle, fuzzers and benchmarks.

1. It corrected freshness to include the origin-provided age. The starter only used
   elapsed time since storage, allowing already-aged entries to remain fresh too long.
2. It stopped restamping shield-to-edge copies with the current time. A copied entry
   now preserves both age and storedAt, so copying cannot create another fresh lifetime.
3. It replaced first-match selection with a search for a reusable fresh entry and a
   suitable validator. When different vary sets overlap, the first matching entry can
   be stale while a later matching entry is usable. The service also compares edge
   and shield validators instead of needlessly fetching a full body.
4. It retained scoped replacement and purge behavior, skipped unchanged writes, and
   handled error-shaped reads defensively. Several of those defensive cases extend
   beyond the normal frozen scenarios; they should not all be called planted defects.
5. Its checker reconstructs per-event cache state from the external observations,
   checks where each delivered/stored representation came from, and compares actual
   origin usage with the limits. It deliberately does not read the service's reports
   as correctness evidence.

The final visible test passed. Its separate curated suite covered seventeen scenarios,
including cross-edge reuse, age-based expiry, changing vary metadata, scoped purges,
no-store, forced validation and mixed workloads. Its **36-candidate × 17-scenario**
checker run reported zero false positives, misses or naming disagreements.

It then ran a broader randomized comparison against its own independent host-aware
oracle, including six correct implementation styles. The final captured 300-seed
output reports **8,100 mutant runs, 2,989 oracle-flagged failures, nine missed by the
checker, zero correct-candidate false positives and zero name mismatches**. The nine
misses must remain visible in the analysis even though the agent's final summary
emphasized the successful classifications.

## The useful self-check gap

All nine misses came from its `wildcard-reuse` mutant. A wildcard vary entry is never
reusable, but the agent's checker intentionally permitted dropping such an entry,
treating it as inert rather than preservation damage. Its own oracle considered some
of those drops invalidation-scope violations. The final checker contains that leniency.

This is a narrower and more useful observation than calling the overall pass a failure.
It shows an acknowledged difference between two self-created models of the contract.
Most executions of that broad mutant still failed for another reason, so candidate-level
rejection could hide the specific preservation gap. The protected bank also rejected
all its candidates; it did not isolate this exact near-correct behavior.

The next local check should isolate removal of an unrelated stored wildcard entry
without also reusing it incorrectly. First resolve the public preservation semantics:
the contract says preserve unrelated entries, but the agent considered inert-entry
eviction ambiguous. If the intended rule forbids that removal, state it precisely and
build a narrow control plus a correct alternative. Do not claim a newly proven hidden
failure until that contract-valid control has actually been executed.

## Why it solved, and what transfers

The bounded API makes the cache state small enough to simulate exhaustively across
many hand-designed and randomized examples. Age arithmetic and copy provenance were
explicit, and the starter's central mistakes were localized. The agent spent more
effort building and testing the checker than repairing those few lines.

The transferable lesson is to evaluate near-correct controls at the level of the
specific obligation and activating scenario. A broadly broken mutant rejected somewhere
in the bank does not prove a checker detects every reason it is broken. Accepting
multiple legitimate implementations is equally important: the agent tested six styles
instead of equating its own call sequence with correctness.

The speculative wildcard follow-up is not implemented in this frozen attempt. Nor
should this result be hardened by forbidding valid libraries, adding undefined origin
failures, or making completion impossible within a declared attainable load limit.

## Evidence and limits

[Sanitized batch evidence](../evidence/2026-09-08-fourth-five.json) preserves original
reward, timing, service/checker results, changed files and capture hashes. The retained
`dev/` tools and command outputs support the self-test account; they are not substituted
for protected grading or independently rerun on the host. This is one exploratory pass,
not universal correctness, official qualification or a measured solve rate. Requested
settings are not backend attestations, and no private reasoning is analyzed.

## Changes applied since this trial (2026-09-08)

This report's "useful self-check gap" — the agent's own randomized sweep finding nine missed wildcard-preservation mutant executions that the hidden bank never caught — was the priority follow-up, and all three reviewing agents independently reproduced two real, distinct false negatives against the real submitted checker.mjs (both traced to the same exemption at its line 545): (1) **wildcard retention** — a same-path wildcard cache entry can never be matched or reused (`domain.mjs`'s `fits()` structurally excludes it from ever matching any request, including its own path), so per the authority's own logic it is always classified "unrelated" and must always survive a write; the submitted checker exempted wildcard entries from this rule entirely. (2) **intermediate damage hidden by restoration** — an illegal intermediate write within one event, corrected by a later write before the event ends, still authoritatively violates `cache_provenance` (the authority checks every observed write against the event-start snapshot, not just the final state), but a checker that only diffs event-start/event-end storage snapshots never sees it.

**Both gaps closed with new controls, not a package rewrite.** Confirmed via direct code tracing that `domain.mjs`'s own ground truth already correctly rejects both patterns — this was purely a scenario/control-bank coverage gap, not a data-exposure or scenario-design gap (the existing `observations` log already carries every individual write call, sufficient for an independent checker to replay this same rule). Added `wildcard-eviction` (overlays `src/store.mjs`; a same-path wildcard entry is dropped when a new one is stored — isolated failure confirmed on the existing `case-022`, the pre-existing `/wildcard` scenario, no new scenario needed) and `intermediate-wipe` (same file; a full-tier wipe immediately undone by the normal correct write — isolated failure confirmed broadly across the seeded multi-event scenarios, clean on the designated `case-020`). Both authoritatively and exclusively fail `cache_provenance`, verified via real Docker build+validate (`local-valid: true`, every candidate including reference/alternative still pass) and direct per-scenario trace inspection.

**Also addressed, preventively:** this report notes the agent's own oracle disagreed with its checker on whether a wildcard drop is a `preservation`/`invalidation-scope` matter. A second, independently-dispatched investigation confirmed the real submitted checker did label a get-time eviction `invalidation_scope` (line 548) where `domain.mjs` says `cache_provenance` — a genuine mislabel, though not one that flipped this trial's already-passing reward. Added an explicit disambiguation to `instruction.md`: `cache_provenance` covers every write during a `get` event (including unrelated-entry eviction); `invalidation_scope` covers only `purge`/`acknowledge` scope.

**When trials run again:** a future checker will need to independently verify legal storage history — not just correct final deliveries and contents — to pass against the widened bank.

## September 9 implementation successor — ready for exploratory trials

The wildcard-eviction and intermediate-wipe controls are now in the maintained source. The public contract retains preservation and legal cache reuse, without worked examples explaining those controls. The starter no longer supplies entry matching, origin resolution, cache writes or the event loop.

Both deliverables now have complete private oracle implementations. The public service
starts from an empty entry point. The checker classifies every supplied case with a
Boolean verdict; optional reasons are ungraded diagnostics, and helper modules are
allowed. Original results above remain historical; no second model trial was run.

Executed validation on this successor:

- Service oracle: 25/25 scenarios; checker oracle: 15/15 candidates.
- Protected Foundry assurance: 18 operations passed; deterministic rebuild and
  exported-CLI recipient reproduction passed, including drift and invalid-execution checks.
- Native Harbor oracle reward 1; native nop reward 0; no Harbor exceptions.
- All 22 pinned upstream static checks and all six local checker/integrity controls passed.
  These local controls are not the official model-powered cheat qualification trials.

Canonical source: `tasks/variant-cache-repair`. Native export:
`.local/top-five-implementation-2026-09-09/harbor-ready/variant-cache-repair`.

Native export digest: `d291ca623b9d2112cfb28670110870c5e5b19dfe3602f6f2c16fc9f79b95f3a3`.
Foundry package digest: `73ca8249918c234c875550b5e7f18a0816847f6f7a54a33e8849ab9f6d9e2e9b`.

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

Run `variant-cache-repair-attempt-1`, package digest
`73ca8249918c234c875550b5e7f18a0816847f6f7a54a33e8849ab9f6d9e2e9b`. Requested target **claude**,
`anthropic/claude-opus-5`, effort `max`. Frozen execution source:
`2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4`.
The pinned author image was
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`.

Started `2026-09-09T11:35:51.061Z`, completed `2026-09-09T12:18:26.116Z`.
One of exactly five fresh campaign attempts, reserved within **232 ms** and reported
running concurrently by the dispatching agent's `docker ps` observation. Budget:
10,800 seconds, 2 CPUs, 2 GiB; signed subscription-only authorization, one attempt,
no automatic retries or recorded paid-API fallback. No timeout is recorded.
Requested settings are not runtime attestations: Claude model strings were observed;
Codex model identity and effort/scaffold versions were unobservable in the captures.
CLI dollar estimates are not subscription charges.

### Changes and recorded results

The public starter's entry-selection, storage, resolution and service modules were
removed. The checker was already a required deliverable in Trial 1. Trial 2 uses
diagnostic-only reasons and includes the `wildcard-eviction` and `intermediate-wipe`
controls added after the earlier self-fuzz analysis. `case-022` was already a service
scenario; the wildcard checker control is new to the scored bank.

**Recorded reward 0. Service 24/25; checker 14/15.** Only service `case-022` fails,
on `cache_provenance`. The checker accepts both valid implementations and rejects
twelve defective candidates, but accepts `wildcard-eviction`. Offline replay of the
unchanged checker reproduces both captured verdict sets. The execution completed;
this was not a timeout, malformed checker or exact-label failure.

The service's `withStored` uses `matchesRequest` to remove old entries on a write.
For an old `vary: ["*"]` entry and empty request headers, its header comparison
succeeds because both absent values default to `""`. In `case-022`, the shield write
at sequence 12 replaces the wildcard entry stored at time 0 with the fresh response
stored at time 1. The private predicate regards every wildcard as nonmatching and
therefore protected from replacement. Deliveries and all other service checks pass.

### Publication audit: public-contract attribution is held

The service fails the private preservation predicate. Whether that violates the
supplied requirement depends on the public definition of matching. The frozen
SEMANTICS.md says:

> A stored representation matches a request if path matches and every header named by
> vary has equal value (absent header means empty string). vary may be empty or ["*"];
> a wildcard is never reusable.

Its update rule replaces old entries matching the current request under the old
`vary`. **Never reusable does not necessarily mean never matching for replacement.**
The submitted service explicitly excludes wildcards from delivery reuse, while its
replacement follows the literal path/header-equality definition. The private `fits`
predicate adds `!e.vary.includes("*")` to matching itself. The task describes a custom
bounded API, not a complete HTTP proxy, so outside HTTP conventions cannot silently
resolve this discrepancy against its own written matching rule.

The first recorded service-suite failure is a real observation. Attribution as a fair
capability failure remains held until the wildcard matching rule is resolved. The
checker miss has the same normative concern. This is not an objection to implied
expert knowledge: it is a concrete difference between two readings of a custom rule.

### Observable effort and historical comparison

The capture analysis reports 76 Bash calls and extensive self-authored fuzzing,
including fixes for two other bugs. Authoring took about 42m20s, within the three-hour
budget. That effort makes the case worth investigating, but duration and self-reported
test counts cannot settle whether a grading requirement was fairly supplied.

Trial 1's service passed 25/25 and its checker passed the then-current 13/13 bank.
Its additional self-fuzzing exposed related wildcard-preservation misses; it did not
produce a scored service failure. Trial 2 is the first scored service failure for
this package. Do not present those two observations as two independent scored failures
or as established durability.

### Next step

Retain the original zero, code and trace. In a new version, state whether a wildcard
matches a request at all, including for replacement, in one compact normative sentence.
Validate the existing preservation controls and correct alternatives against that rule,
then retrial. A worked wildcard-eviction example or implementation hint is unnecessary.
Do not count the current result as an undisputed service-level win before that repair.

### Evidence and qualification boundary

The publication audit checked **996 manifest-listed files**
for this record with zero mismatches and compared all four supplied contract/interface
files against the frozen export. Raw evidence remains at
`.local/round-two-top-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/variant-cache-repair-attempt-1/`.
The earlier Trial 1 text and dated engineering additions above are preserved.

[Campaign results and audited decisions](../round-two-top-five-2026-09-09.md) ·
[Sanitized trial evidence](../evidence/2026-09-09-round-two-top-five.json) ·
[Integrity and diagnostic evidence](../evidence/2026-09-09-round-two-top-five-audit.json).

This is an exploratory repository assessment. The immutable result still records
`adjudication: unlabelled`, `modelEvidenceEligible: false` and
`countsAsModelFailure: false`; publication does not change those fields or claim
six standard failures, official cheat qualification or independent blind review.

## Trial 3 — repeat attempt — September 9, 2026

### Identity and execution

Run `variant-cache-repair-attempt-1` in a fresh Trial-3 campaign slot, package digest
`73ca8249918c234c875550b5e7f18a0816847f6f7a54a33e8849ab9f6d9e2e9b` — byte-identical to
Trial 2's package; the controller hard-asserted the profile and instruction hash matched
the Trial 2 record before dispatching, so any behavioral difference here is attributable
to the solver, not to a changed contract or setting. Requested target **claude** (same
provider as Trial 2), `anthropic/claude-opus-5`, effort `max`, CLI `2.1.263`. Observed:
model `claude-opus-5` confirmed; effort and scaffold version unobservable, as in Trial 2.
Frozen execution source `2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4`,
reused byte-for-byte from Trial 2's runtime build. Pinned author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`.

Started `2026-09-09T19:02:12.628Z`, completed `2026-09-09T19:26:50.546Z`. Total elapsed
≈1,477,918 ms (~24m38s); authoring ≈1,463,282 ms (~24m23s); grading ≈14.6s. One of exactly
five fresh Trial-3 attempts, reserved and dispatched within a 217ms window, confirmed
running concurrently via `docker ps`. The solver received only the original public task
inputs (`SEMANTICS.md`, `CHECKER-INPUT.md`, `api.d.ts`, the empty starter) — no prior
submission, analysis, or this handoff — so this is a genuinely independent fresh
implementation, not a resubmission. Input/output tokens: 4,049,109 in (3,902,452 cached),
123,574 out; CLI cost estimate $6.51 (not a charge — subscription-only, `maxMicroUsd: 0`).

### Results

**Reward 0. Service 5/25 passed; checker 14/15 correct.** The checker missed the same candidate; the service failed on a different obligation:

- **Service (24/25 in Trial 2 → this attempt fails far more broadly): 20 of 25 scenarios**
  (`case-000` through `case-019`) fail on `origin_load`, not `cache_provenance`. In the one
  fully-inspected cell (`case-000`), the final cache state is `{"edge-a":[],"edge-b":[],
  "shield":[]}` — completely empty — despite many repeated identical-path/header requests
  in the delivered sequence that a working cache should have served from a stored entry
  without re-hitting the origin. The consequence is exactly what `origin_load` polices:
  the origin is consulted far more than the declared `maxOriginRequests` budget permits.
  This is a different check, a different scenario range, and a more severe defect than
  Trial 2's single-scenario `case-022`/`cache_provenance` miss.
- **Checker (14/15, unchanged from Trial 2's own count): the exact same candidate is
  missed.** `wildcard-eviction`, `expectedFailingCheck: cache_provenance`,
  `observedFailingChecks: ["cache_provenance"]`, `outcome: missed` — byte-identical
  classification outcome to Trial 2, produced by an independently-written `checker.mjs`.
  0 false positives.

### Comparison with Trial 2 and recurrence assessment

**The checker-side defect recurred identically.** Two independently-written checkers,
from the same model/provider, on the same unchanged package, both wrongly accepted the
`wildcard-eviction` negative control against the same `cache_provenance` obligation. That
records a repeated missed candidate. The existing Trial 2 matching/replacement
contract-attribution note remains attached to that earlier result; this repeat does
not resolve it by itself.

**The service failed on a different obligation.** Trial 3 exceeded the declared
origin-request budget in 20 scenarios, while Trial 2 failed one cache-provenance
scenario. The empty final cache in the inspected cell is recorded evidence, but the
precise code-level cause has not been established. The earlier wildcard-storage
hypothesis was not confirmed and should not be treated as the root cause.

These are two consecutive recorded zeroes on an unchanged package. A valid service
or required-checker failure can count even when the concrete bug changes between
attempts. Exact defect recurrence is additional analysis, not an acceptance gate.

### Observable solving behavior

The capture (887 events) shows extensive self-testing focused heavily on the *checker's*
correctness: the final completion message reports checker self-tests against 40 targeted
plus 7 hand-written plus 143 fuzzed negative executions (all correctly rejected) and 128
runs across seven distinct legitimate alternative service strategies (all correctly
accepted), plus a 300-cell performance run. The same summary explicitly discusses two
self-identified interpretive judgment calls about cross-tier copying and observationally
equivalent encodings, disclosed rather than hidden. Notably, this final self-report is
about checker quality; it does not mention validating `entry.mjs` itself against an
origin-load budget or a wildcard-vary-heavy traffic scenario, which is consistent with
that specific service-side gap going unnoticed by the agent's own testing.

### Failure-mechanism attribution and next step

Trial 3 has a supported service failure: its origin-request counts exceed the
public budget. The checker also missed the same retained control. Keep the scores
and causes distinct, including Trial 2's earlier matching/replacement note. Continue
testing the unchanged package; a different service defect does not require a reset
or disqualify this Trial 3 failure.

### Acceptance progress and next prepared attempt

This unchanged successor has **2 failures and 0 solver passes in two scored attempts**, both on Claude. The user reports that the CEO accepts at least **five failures out of six**, with three attempts per provider; six consecutive failures is the stricter aspiration, not the acceptance threshold. This package remains within that threshold and needs **3 failures from the remaining four attempts**. Different failure mechanisms can count; no identical-bug requirement is added.

The next attempt is **Trial 4 in this document, the third attempt on this successor**, using the same provider, package and saved profile again. Afterward, this package will have three runs on its original provider and will need three on the other provider. [Prepared Trial 4 handoff](../../../docs/round-four-failing-five-handoff.md). Preparation launches no model calls.

## Trial 4 — third unchanged-successor attempt — September 9, 2026

### Identity and execution

Run `variant-cache-repair-attempt-1` in a fresh Trial-4 campaign slot, package digest
`73ca8249918c234c875550b5e7f18a0816847f6f7a54a33e8849ab9f6d9e2e9b` — byte-identical to
Trials 2 and 3; the controller hard-asserted the profile and instruction hash matched
the Trial 3 record before dispatching. Requested target **claude** (third consecutive
Claude attempt), `anthropic/claude-opus-5`, effort `max`, CLI `2.1.263`. Frozen execution
source `2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4`, reused
byte-for-byte from Trials 2–3. Pinned author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`.

Dispatched `2026-09-09T19:56:46.857Z`, completed `2026-09-09T20:28:24.888Z` (~31m38s),
well under the 10,800s (3h) cap. One of exactly five fresh Trial-4 attempts, reserved
and dispatched within a 223ms window, confirmed running concurrently via `docker ps`.
The solver received only the original public task inputs — no prior submission,
analysis, or this campaign's handoff. Tokens: 11,337,067 in (11,141,458 cached),
151,534 out; CLI cost estimate $11.32 (not a charge — subscription-only,
`maxMicroUsd: 0`). completionSha256
`789d651e3ccdb264313820f15be8d75e9415fa9b90e10a9678659c3089ce5f22`, resultSha256
`9d0f5007f5512c7339939c48707543403dd047156b4d4e289c47df89e99a52ce`, gradeSha256
`86e4df4215c871709e7e60dc1408913288b8aff37dc6c00dc8e6ca7c10126693`. 1,028
manifest-listed files (63,782,538 bytes) reverified with zero errors this session.

### Results

**Recorded reward 0. Service 3/25 passed, 22/25 failed; checker 14/15.**

- **Service: 22 of 25 scenarios fail, every one on `cache_provenance`** (case-000
  through case-020 and case-023; case-021/022/024 pass). This is a *third* distinct
  service-failure magnitude on this package: Trial 2 failed 1/25 (`cache_provenance`,
  case-022 only), Trial 3 failed 20/25 (`origin_load`), Trial 4 fails 22/25
  (`cache_provenance` again — the same named check as Trial 2, at far greater scale).
- **Checker (14/15, unchanged count from Trials 2–3): the exact same candidate is
  missed.** `wildcard-eviction`, `expectedFailingCheck: cache_provenance`,
  `observedFailingChecks: ["cache_provenance"]`, `outcome: missed` — the third
  independently-written checker in a row to accept this negative control. 0 false
  positives; both `reference` and `alternative` correctly accepted.

### Code-level recurrence verification

**The checker-side miss is a confirmed exact recurrence across all three trials, via
three different code shapes converging on the identical behavioral gap.** Reading each
submission's `checker.mjs`:

- Trial 2's `matchesRequest(entry, path, headers)` loops `for (const name of entry.vary)`
  and compares `hv(entry.headers, name)` against `hv(headers, name)` with **no special
  case for `"*"`** — for a `vary: ["*"]` entry, this looks up a header literally named
  `"*"` on both sides, which is absent from both and so trivially equal, making the loop
  fall through to `return true`.
- Trial 3 took a different shape: `entryMatches()` explicitly returns `false` for a
  wildcard entry, but the removal-legality check is
  `entryMatches(...) || isWildcard(r.vary) || r.noStore === true` — an explicit
  wildcard exception that always treats the removal as legal regardless.
- Trial 4's `matchesReq(entry, path, headers)` loops `for (const name of entry.vary)`
  with `if (name === "*") continue;` — skipping the wildcard name outright, so with no
  other vary names left to check it also falls through to `return true`.

All three independently-written checkers therefore classify a same-path write as
legally entitled to evict a pre-existing `vary: ["*"]` entry, despite `SEMANTICS.md`
stating a wildcard is "never reusable" — none of the three ever encode that a wildcard
entry's *removal* needs separate justification from its *reuse*. This is the same
missing check, not merely the same symptom, expressed through three distinct code
paths (an omitted special case, an unconditional true-branch, and an explicit
exception) — a genuine third-consecutive exact recurrence, not just a repeated label.

**The service-side failure is also the same root cause as Trial 2's, not Trial 3's.**
Trial 4's `entry.mjs` defines its own `matchesRequest(entry, path, headers)`
identically to its checker's `matchesReq`: `for (const name of varyOf(entry)) { if
(name === "*") continue; ... }`, again trivially returning `true` for any `vary: ["*"]`
entry regardless of request headers. This function is used in **two** write paths:
(1) the shield→edge "pull down" copy on a cache hit — `edge.filter(e =>
!matchesRequest(e, path, headers))` before writing the copied entry — and (2) storing
a freshly-fetched response — `edge.filter(...)`/`shield.filter(...)` before appending
the new entry. Both unconditionally strip any pre-existing wildcard entry at that path
from the tier being written, on every hit *and* every miss. This is structurally the
same bug Trial 2's write-up already established (Trial 2: "the private predicate
regards every wildcard as nonmatching and therefore protected from replacement... the
submitted service explicitly excludes wildcards from delivery reuse, while its
replacement follows the literal path/header-equality definition" — i.e. reuse and
removal-legitimacy are decided by two different rules, and only the reuse rule
excludes wildcards). Trial 4 has the identical mismatch between `reusable()` (excludes
wildcards) and `matchesRequest()` (does not), just exercised on both the hit and miss
paths instead of Trial 2's narrower single-scenario trigger — which is the direct,
code-confirmed explanation for the 1/25 → 22/25 jump. Trial 3's separate `origin_load`
defect did not recur here; Trial 4 shows 0 `origin_load` failures.

**Self-test contradiction.** The agent's final message claims: "Verified against a
tier-faithful reference model over 800 randomised scenarios: identical origin-request
count in every one," and separately states as an intentional design choice that
"No-store and `Vary:*` responses are delivered but never stored." Its self-testing
narrative covers origin-request-count parity and the checker's own 32-candidate/2,100-run
false-rejection fuzz — but never describes testing whether a *pre-existing* wildcard
entry survives an unrelated same-path write, which is exactly the scenario the scored
bank probes and exactly where this submission fails 22/25 times. The claimed self-test
coverage does not contradict the grading result outright, but it does not touch the
actual failure surface either.

### Acceptance progress and next prepared attempt

This package now has **3 failures in 3 scored Claude attempts (3/3) — three consecutive
recorded zeroes**, the strongest possible outcome on its original-provider allocation.
The user reports the CEO accepts at least **five failures out of six**, three Claude and
three Codex; this package needs **at least 2 more failures from its remaining 3 Codex
attempts** to reach 5/6. Those opposite-provider attempts are not part of this batch and
are not authorized here. The existing Trial 2 matching/replacement contract-attribution
note (the "never reusable does not necessarily mean never matching for replacement"
question) remains open and unresolved by this repeat — it now has three consecutive
supporting service/checker observations behind it rather than one.

### Next batch prepared — September 9, 2026

This package continues at **3/3 failures**. Its
three Claude attempts are complete. The user authorized the next attempt on
**Codex**, using the exact same package and grading. This is **Trial 5**
in this history, the fourth attempt on the unchanged successor and the first
with the opposite provider. It runs concurrently with the other three continuing
packages. The remaining three provider slots need at least two failures to
reach 5/6; only the first of those slots is prepared for this launch.

[Prepared controller and handoff](../../../docs/round-five-continuing-four-handoff.md).
No new model attempt was launched during preparation. Different valid failure
mechanisms and required-checker-only failures can count; the provider switch
does not reset or discard the existing results.

## Trial 5 — first opposite-provider attempt — September 9, 2026

### Identity and execution

Run `variant-cache-repair-attempt-1` in a fresh Trial-5 campaign slot, package digest
`73ca8249918c234c875550b5e7f18a0816847f6f7a54a33e8849ab9f6d9e2e9b` — byte-identical to
Trials 2–4. Requested target switched to **codex** (first Codex attempt on this
package, after three consecutive Claude attempts), `openai/gpt-5.6-sol`, effort
`xhigh`, CLI `0.153.2`, replacing Trials 2–4's `anthropic/claude-opus-5` / `max` /
CLI `2.1.263`. Same frozen execution source
`2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4` and pinned author
image `sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a` as all
prior trials.

Dispatched `2026-09-09T20:55:29.274Z`, completed `2026-09-09T21:26:25.227Z` (~30m56s),
well under the 10,800s (3h) cap. One of exactly four fresh Trial-5 attempts (the other
continuing packages, minus snapshot recovery, which is excluded from this six-run
threshold), confirmed running concurrently via `docker ps`. The solver received only
the original public task inputs — no prior submission, analysis, or this campaign's
handoff. Tokens: 1,963,212 in (1,875,328 cached), 55,609 out; the Codex CLI reports
tokens but never a price (cost null). completionSha256
`83bea01488e246a8097e38c14acf2d06a9e266f4f9640f834f5e33b60617db3a`, resultSha256
`9b61c103cf8d2bccf0ecb10a7bfae33ec4867b3ccb6984c60c658f256464de4a`, gradeSha256
`424bb6b927b13607248732de51b8ab27864f8ec1d4730a070b83d115146a0f05`. 972
manifest-listed files (61,047,451 bytes) reverified with zero errors this session.

### Results

**Recorded reward 1 — this package's first pass, ending three consecutive Claude
failures. Service 25/25 passed; checker 15/15.**

- **Service: all 25 scenarios pass, 0 failures.** This first Codex submission avoided
  both prior service defects: Trial 4's `matchesRequest()` wildcard blind spot
  (confirmed to share Trial 2's exact root cause) and Trial 3's separate `origin_load`
  failure.
- **Checker: 15/15 correct, 0 missed, 0 false positives, deterministic, pass=true.**
  Notably, this checker correctly caught `wildcard-eviction`
  (`expectedFailingCheck: cache_provenance`) — the exact candidate all three prior
  Claude checkers (Trials 2, 3, 4) missed via three different code shapes. Reading
  `checker.mjs`: its `matches(entry, event)` predicate returns `false` whenever
  `entry.vary.includes("*")`, and its write-legality check
  (`unrelatedRemoved = removed.filter((entry) => !matches(entry, event))`) flags *any*
  removed entry that doesn't match as an illegal "unrelated eviction" — so a wildcard
  entry, which never matches by construction, can never be legally removed at all. This
  closes the gap directly: unlike the three prior checkers (which only withheld
  wildcard entries from *reuse* but left their *removal* unguarded), this one ties
  removal-legality to the same non-matching predicate that already excludes wildcards,
  so the reuse and removal rules can no longer disagree.

### Progress toward the reported five-of-six acceptance threshold

This package's six-run record is now **3 Claude failures (Trials 2–4) + 1 Codex pass
(Trial 5) = 3 failures, 1 pass, across 4 of 6 planned attempts.** Two Codex attempts
remain. Reaching the reported "at least five failures out of six" threshold now
requires **both** remaining Codex attempts to fail (3 + 2 = 5); a single additional
pass among them caps the total at 4, below threshold. This is a real tightening from
before Trial 5, when 2 of the remaining 3 attempts needed to fail — with only 2 slots
left, the margin for error is gone. Neither remaining attempt is authorized or
dispatched by this campaign.


### Final-six audit and preparation — September 9, 2026

No additional grading defect was established for this package in the targeted audit.
Its recorded and effective histories remain **0 → 0 → 0 → 1**:
**3 failures in 4 scored attempts**. Two Codex
slots are prepared on the unchanged package and pinned provider profile. Both must fail to reach 5/6; stop after a pass.

The [audit](../final-six-pass-audit-2026-09-09.md) preserves raw records and documents
the separate `final-six-coverage-v1` regrade. The same revision applies to all retained
and future attempts for affected tasks; this is no new public task requirement. See the
[prepared identities](../evidence/2026-09-09-final-six-preparation.json) and
[operator handoff](../../../docs/final-six-handoff.md). No new model trial has launched.

## Trial 6 — final-six campaign, stopped after a pass — September 9, 2026

### Identity and execution

Run `variant-cache-repair-attempt-1` in the final-six campaign's Trial-6 slot
(`variant-cache-repair-final-six-trial-6`), package digest
`73ca8249918c234c875550b5e7f18a0816847f6f7a54a33e8849ab9f6d9e2e9b` — byte-identical to
Trials 2–5 — profile digest `a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641`.
Requested target **codex** (second consecutive Codex attempt, after Trial 5),
`openai/gpt-5.6-sol`, effort `xhigh`, CLI `0.153.2`. Same frozen execution source
`2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4` and pinned author
image `sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a` as every
prior trial.

Dispatched `2026-09-09T22:24:22.447Z`, completed `2026-09-09T22:46:28.860Z` (~22m7s),
well under the 10,800s (3h) cap. The solver received only the original public task
inputs — no prior submission, analysis, or this campaign's handoff. Tokens: 1,357,907 in
(1,283,840 cached), 39,000 out; the Codex CLI reports tokens but never a price (cost
null). completionSha256
`173758cc990a4c52c07cdbcf4ecabb03431fe08a16f8bd5e24b5ffc2f2ef56cc`, resultSha256
`3201d09c89dcab588f3da762f47f6ea9f97fb8c0e08380327088bbc18c27c855`, gradeSha256
`424bb6b927b13607248732de51b8ab27864f8ec1d4730a070b83d115146a0f05`. 972 manifest-listed
files (61,145,106 bytes) reverified with zero errors this session. No supplemental
grading policy applies to this package (unlike temporal-capacity-repair and
snapshot-recovery-repair); raw and effective reward are identical, both 1.

### Results

**Recorded reward 1 (outcome `semantic-pass`) — this package's second consecutive pass.
Service 25/25 passed; checker 15/15.**

- **Service: all 25 scenarios pass, 0 failures** — fully correct, matching Trial 5's
  clean run and avoiding every defect recorded across Trials 2–4.
- **Checker: 15/15 correct, 0 missed, 0 false positives, deterministic, pass=true.**
  Notably, this checker again correctly caught `wildcard-eviction`
  (`expectedFailingCheck: cache_provenance`) — the same candidate Trial 5's checker also
  caught, and the exact candidate all three prior Claude checkers (Trials 2, 3, 4) missed.
  Reading this submission's `checker.mjs`: its `matching(entry, event)` predicate returns
  `false` whenever `entry.vary.includes("*")`, and `legalGetWrite()` flags any removed
  entry that fails that same predicate as an illegal unrelated eviction — the same
  structural fix as Trial 5's checker (tying removal-legality to the identical
  non-matching predicate that already excludes wildcards from reuse), expressed through
  differently-named functions (`matching`/`legalGetWrite` here vs. Trial 5's
  `matches`/inline `unrelatedRemoved`). Two independently-written Codex checkers now
  close this gap the same way; neither of the two Codex submissions has repeated the
  three Claude checkers' miss.

### Final classification for this package — six-run set incomplete, threshold unreachable

This package's second authorized Codex slot, Trial 7, was never launched — no attempt
was reserved, no model call was made, and no cost was incurred. Its full recorded
history is:

**T2 = 0 (Claude) · T3 = 0 (Claude) · T4 = 0 (Claude) · T5 = 1 (Codex, pass) · Trial 6 =
1 (Codex, pass) — 3 failures out of 5 scored attempts, using only 3 Claude + 2 Codex
attempts, not the full 3-Claude/3-Codex balance a completed six-run set requires.**
Recorded and effective outcomes are identical across all five scored attempts:
0 → 0 → 0 → 1 → 1.

The campaign's own acceptance rule is `failures + remainingAttempts >= 5`. With 3
recorded failures and at most 1 remaining attempt (the unused Trial 7 slot), the maximum
reachable total is **3 + 1 = 4**, below the reported five-of-six bar regardless of what a
hypothetical Trial 7 would have scored. Passing on Trial 6 is exactly what made
continuing pointless: the prior progress note above (after Trial 5) held that *both*
remaining Codex attempts needed to fail to reach 5/6 — with only two slots left, a single
additional pass among them would already cap the total at 4. Trial 6 was that pass, so
the threshold became mathematically unreachable the moment it graded, and dispatching
Trial 7 could no longer change the outcome.

State this plainly: **this package stopped one attempt short of a complete six-run set
specifically because reaching the threshold became impossible, not because of any
infrastructure issue, grading error, or exhausted budget.** It remains an incomplete,
stopped-early set — not a completed six-run failure count and not a completed six-run
pass count — and is not eligible to be reported as a scored 5-of-6 (or any other
six-of-six-denominated) result, because only 5 of the 6 authorized attempts were ever
run.

### Evidence

Raw evidence for this trial remains at
`.local/final-six-2026-09-09/variant-cache-repair/trial-6/real-campaign-frozen/jobs/real-provider/records/variant-cache-repair-attempt-1/`,
with Trial 5 (the first Codex pass) at
`.local/round-five-continuing-four-2026-09-09/real-campaign-frozen/jobs/real-provider/records/variant-cache-repair-attempt-1/`
for comparison. The prepared-but-unused Trial 7 slot is recorded at
`.local/final-six-2026-09-09/variant-cache-repair/trial-7/` — a prepared READY file and
preparation event log only. No reservation, dispatch claim, JobStore or completed
job record was created there. The campaign's own outcome record,
`.local/final-six-2026-09-09/expanded/outcomes/variant-cache-repair.json`, independently
confirms this arithmetic: `failures: 3, scored: 5, qualified: false, stoppedBelowThreshold: true`. The [final campaign](../final-six-2026-09-09.md)
records all six completed attempts.

This is an exploratory repository assessment. The Trial 6 result still records
`adjudication: unlabelled`, `modelEvidenceEligible: false` and
`countsAsModelFailure: false`; nothing above claims a completed six-run set, official
cheat qualification, or independent blind review.

## Post-final pass audit — September 9, 2026

**Current effective score: 4 failures / 5 scored trials. Reopened for the remaining provider slots.**

The new valid control warms the second edge with a legitimate copy of the first origin-derived asset. Trial 5 rejects that copy because its checker restricts get writes to the active edge and shield. Trial 6 accepts it. The frozen service verifier and private reference checker accept the control.

| Trial | Provider | Original reward | Previous effective reward | Current effective reward | Cumulative supplemental classifications |
| --- | --- | --- | --- | --- | --- |
| 2 | Claude | 0 | 0 | **0** | 2/2 |
| 3 | Claude | 0 | 0 | **0** | 2/2 |
| 4 | Claude | 0 | 0 | **0** | 2/2 |
| 5 | Codex | 1 | 1 | **0** | 1/2 |
| 6 | Codex | 1 | 1 | **1** | 2/2 |

Trial 7, Codex: one failure is needed for 5/6. No new model trial was launched by this audit.

All retained attempts received the same cumulative `post-final-coverage-v2` controls. Original rewards, manifests and the preceding trial sections remain unchanged. Local replay of both previously passing services on this task's new scenario passed; the new failure is in the required checker.

[Full audit and contract basis](../post-final-pass-audit-2026-09-09.md) · [Sanitized per-trial evidence](../evidence/2026-09-09-post-final-pass-audit.json).

## Trial 7 -- post-final-coverage-v2 campaign, final attempt -- September 9, 2026

### Identity and execution

Run `variant-cache-repair-attempt-1` in the `post-final-coverage-v2` campaign's
Trial-7 slot, this package's **last authorized attempt**, package digest
`73ca8249918c234c875550b5e7f18a0816847f6f7a54a33e8849ab9f6d9e2e9b` -- byte-identical to
Trials 2-6 -- profile digest `a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641`.
Requested target **codex** (third consecutive Codex attempt, after Trials 5-6),
`openai/gpt-5.6-sol`, effort `xhigh`, CLI `0.153.2`. Same frozen execution source
`2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4` and pinned author
image `sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a` as every
prior trial.

Dispatched `2026-09-10T00:51:23.856Z`, completed `2026-09-10T01:14:04.271Z` (~22m41s),
well under the 10,800s (3h) cap. The solver received only the original public task
inputs -- no prior submission, analysis, or this campaign's handoff. Tokens: 1,384,789 in
(1,252,480 cached), 38,457 out; the Codex CLI reports tokens but never a price (cost
null). completionSha256
`7744062b2ddc978507e091021088925498e3206ddf1b9c9744f0f99315bb4c30`, resultSha256
`a088e5a2ec0f6a806039b9f63f0348b7e5164e3510d6b2722d1545125db38a9d`, gradeSha256
`424bb6b927b13607248732de51b8ab27864f8ec1d4730a070b83d115146a0f05`. 972 manifest-listed
files (59,345,897 bytes) reverified with zero errors this session. This package now
carries the `post-final-coverage-v2` supplemental grading policy, first applied in the
audit above; effective reward is the conjunction of the recorded grade and the
supplemental result.

### Results

**Recorded (raw) reward 1. Effective reward 1 -- both the base grade and the
post-final-coverage-v2 supplement pass; no divergence on this trial.**

- **Base service: 25/25 scenarios passed** -- fully correct against the original
  protected bank.
- **Base checker (original candidate bank): 15/15 correct, 0 missed, 0 false
  positives, deterministic, pass=true.** This is the same 15-candidate bank Trials 5
  and 6 also passed cleanly, including `wildcard-eviction` and `intermediate-wipe`.
- **Supplemental grade (`post-final-coverage-v2`, the new targeted control specific
  to this package): 2/2 correct, deterministic, exactTokens true, pass=true.** The
  control legitimately copies an origin-derived asset into a second, initially-empty
  edge cache during a first `GET`, preserving `age`/`storedAt` and using only one
  origin call -- the exact valid alternative that Trial 5's checker wrongly rejected
  as `get changed unrelated tier edge-b`, and that Trial 6's checker had already
  fixed. Trial 7's checker correctly accepts it too: reading `checker.mjs`, its
  get-write legality check builds a `possibleCopies` list from every entry already
  present in the other tiers for that event and accepts a new entry that deep-equals
  one of them (`possibleCopies.some((source) => isDeepStrictEqual(entry, source))`),
  rather than restricting a get's legal writes to only the tier that was hit.

### Final classification for this package -- six-run set closed at 4/6

**This was the package's final authorized attempt, and it needed to FAIL to reach
the reported "at least five failures out of six" threshold. It passed both the base
bank and the new supplemental control instead.**

Final effective history across the complete six-run set:

**T2 = 0 (Claude) -- T3 = 0 (Claude) -- T4 = 0 (Claude) -- T5 = 0 (Codex, effective;
recorded 1, corrected by the post-final pass audit above) -- Trial 6 = 1 (Codex) --
Trial 7 = 1 (Codex) -- 4 failures out of 6 scored attempts**, with a complete,
balanced **3 Claude + 3 Codex** provider split.

This package's six-run set is now **CLOSED at 4/6**, which cannot reach the reported
"at least 5 failures out of 6" threshold. No further attempts remain authorized or
possible under the fixed six-run design. State this plainly: this is the package's
final, settled outcome -- not an incomplete or stopped-early set like the earlier
five-run record after Trial 6, but a complete six-run set that fell one failure
short.

### Evidence

Raw evidence for this trial remains at
`.local/final-six-2026-09-09/variant-cache-repair/trial-7/real-campaign-frozen/jobs/real-provider/records/variant-cache-repair-attempt-1/`,
with `grading/submission/entry.mjs` and `grading/submission/checker.mjs` holding this
trial's actual submitted code, `result.json` and `grading/checker-grade/grade-summary.json`
the base-grade results, and the `post-final-coverage-v2` supplement recorded separately
at `.local/post-final-five-2026-09-09/adjudicated/variant-cache-repair-trial-7.json`
(policySha256 `6b085af92e4b903f6b46cb93e430fafa946316818970c7eb89fd27b4298ac6d7`). The
prior Trial 5, Trial 6 and post-final-pass-audit sections above are preserved unchanged.

This is an exploratory repository assessment. The Trial 7 result still records
`adjudication: unlabelled`, `modelEvidenceEligible: false` and
`countsAsModelFailure: false`; nothing above claims official cheat qualification or
independent blind review. It does state, without qualification, that this package's
complete six-run set is closed at 4 failures out of 6.


## Remaining-pass audit and replacement disposition — September 9, 2026

Trials 6 and 7 Codex both reject a legitimate origin-derived `/asset` copy into the
empty second edge while the active get is for `/revalidate`. The contract permits
legitimate tier copies and requires preserving unrelated entries; it does not impose
an active-path-only copying restriction. All fields and unrelated content survive,
there is no additional origin request for the copy, and the frozen service verifier
and private reference checker accept the execution. T6 rejects `get b stored an
unrelated path`; T7 rejects `cache write fabricated or evicted a representation`.

T7 also accepts retained stale metadata after a 304 validation. This exposed missing
coverage in our frozen service verifier and original private reference checker too;
the new private metadata validator rejects it under the pre-existing refresh rule.
T6 correctly rejects that negative control. T7 additionally rejects a valid fresh
cache response after an extra origin call. These are checker defects; both actual
services pass the three new scenario replays apiece.

The user elected **grading voids, not counted failures**, for these newly discovered
false passes. T6/T7 raw grades remain 1; their diagnostic v3 regrades are 0; their
counted rewards are null. Retained T2–T5 are four failures. Fresh independent Codex
T8/T9 replace T6/T7. At least one must fail to finish at ≥5/6.

| Trial | Provider | Original reward | Cumulative v3 diagnostic reward | Counted reward |
| --- | --- | --- | --- | --- |
| 2 | claude | 0 | 0 | 0 |
| 3 | claude | 0 | 0 | 0 |
| 4 | claude | 0 | 0 | 0 |
| 5 | codex | 1 | 0 | 0 |
| 6 | codex | 1 | 0 | Unscored — grading void |
| 7 | codex | 1 | 0 | Unscored — grading void |

Current counted record: **4/4 failures**; 2 fresh replacement slot(s) pending.

[Full audit](../remaining-pass-audit-2026-09-09.md) · [Verified evidence](../evidence/2026-09-09-remaining-pass-audit.json) · [User-selected counting disposition](../evidence/2026-09-09-three-replacement-disposition.json).

Original submissions and grades were preserved and manifest-verified before and after
the audit. The same cumulative controls covered all 24 retained submissions across
the four audited packages. No new model calls were made during this audit.

## Trials 8-9 — remaining-pass-coverage-v3 replacements for voided Trials 6-7 — September 9, 2026

### Background: why Trials 6 and 7 are voided, not counted as failures

A third audit, `remaining-pass-coverage-v3` (see
[the audit](../remaining-pass-audit-2026-09-09.md)), found that Trials 6 and 7 —
both previously published above as effective passes, with recorded reward 1 —
were rejecting a legitimate tier-copy execution that the contract permits. Rather
than fold these two into the six-run denominator as counted failures, the user
elected a **void-and-replace policy**: Trials 6 and 7 are marked **VOID**. Their
original reward of 1 is preserved permanently, their diagnostic v3 regrade of 0 is
recorded for transparency, but their **counted** reward is set to `null` — neither
a pass nor a failure in the six-run tally. Nothing in the Trial 6, Trial 7,
"Post-final pass audit", or "Remaining-pass audit" sections above is edited,
removed, or renumbered by this disposition; this section is a pure append.

Two fresh Codex replacements were dispatched together, in independent blind
workspaces, under the same `remaining-pass-coverage-v3` grading: **Trial 8**
replaces the void at Trial 6, and **Trial 9** replaces the void at Trial 7.

### Identity and execution

Both trials share package digest
`73ca8249918c234c875550b5e7f18a0816847f6f7a54a33e8849ab9f6d9e2e9b` and profile
digest `a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641` —
byte-identical to Trials 2–7. Both were requested target **codex**,
`openai/gpt-5.6-sol`, effort `xhigh`, CLI `0.153.2` — the same author image and
frozen runtime as every prior trial. Each trial ran in its own independent blind
workspace with no knowledge of the other's submission or of the voided Trial 6/7
submissions it replaces.

- **Trial 8** (replacing voided Trial 6): duration 25m33s. Tokens: 1,530,146 input
  (1,459,584 cached), 45,582 output; the Codex CLI reports tokens but never a price
  (cost null). completionSha256
  `50ace9d914c339a4c3ad2564bdadac0d3792aa7ce9fab00920dec813d11d12f4`, resultSha256
  `57efc0876953a5bc9e853ff58aea5a9d674d514d6f18fe835fd63109b39e8d2d`, gradeSha256
  `424bb6b927b13607248732de51b8ab27864f8ec1d4730a070b83d115146a0f05`. 972
  manifest-listed files (59,385,129 bytes).
- **Trial 9** (replacing voided Trial 7): duration 18m14s. Tokens: 658,882 input
  (604,544 cached), 32,088 output; cost null. completionSha256
  `f53f94c0dcc4d7403505a6fc84e6acd3006d495e49856a00badd8e5314b2d476`, resultSha256
  `cc1b0910b210a5202cbba7e91456b18a593929e1583bbe11526bb3bb32311082`, gradeSha256
  `424bb6b927b13607248732de51b8ab27864f8ec1d4730a070b83d115146a0f05`. 972
  manifest-listed files (60,923,707 bytes).

Both manifests were reverified with zero errors this session; that check was
combined with a third package's replacement trial into a single
2,729-file / 123,073,664-byte reverification spanning this entire
three-attempt `remaining-pass-coverage-v3` replacement round, not just this
package's two trials.

### Results — Trial 8 (replacing voided Trial 6)

**Recorded (raw) reward 1. Counted (effective) reward 0.**

- **Base service: 25/25 scenarios passed** — fully correct.
- **Base checker (original candidate bank): 15/15 correct, 0 missed, 0 false
  positives, pass=true.**
- **Cumulative `remaining-pass-coverage-v3` checker supplement: 6/8 correct,
  deterministic, exactTokens true, pass=FALSE.** Two controls fail:
  **`copy-other-path-control`** is a valid tier-copy of an existing edge-a entry
  into an empty edge-b during a different-path `get`. The checker rejects it
  (`expectedOk: true`, `actualOk: false`) with *"cell 0: get b stored a fabricated
  or non-storable entry."* **`stale-304-metadata-control`** retains stale cache
  metadata after successful revalidation; the checker incorrectly accepts it
  (`expectedOk: false`, `actualOk: true`). Six of eight classifications are correct.
- **Service replay:** a separate service-level replay against the same three
  new scenarios (`stale-304-metadata`, `fresh-plus-origin`, `copy-other-path`),
  using the newly repaired private 304-metadata validator, confirms the
  **submitted service itself is fully correct on all three**
  (`metadataCurrent: true` in every case). This is a required-checker-only
  failure, not a service defect.

### Results — Trial 9 (replacing voided Trial 7)

**Recorded (raw) reward 1. Counted (effective) reward 0.**

- **Base service: 25/25 scenarios passed** — fully correct.
- **Base checker (original candidate bank): 15/15 correct, 0 missed, 0 false
  positives, pass=true.**
- **Cumulative supplement: 6/8 correct, deterministic, exactTokens true,
  pass=FALSE.** The same two controls fail: it rejects `copy-other-path-control`
  (`expectedOk: true`, `actualOk: false`) with *"cell 0: illegal cache write to edge-b,"*
  and accepts `stale-304-metadata-control` (`expectedOk: false`, `actualOk: true`).
  The copy-rejection message differs from Trial 8, but the same legitimate
  tier-copy behavior is rejected in both attempts.
- **Service replay:** the same three-scenario replay again confirms the
  submitted service is fully correct on all three; this is again a
  required-checker-only failure.

### Code-level recurrence: the same copy rejection across four independent Codex checkers

Reading both replacement checkers directly and comparing them to what the
Trial 6 and Trial 7 sections above already established about those voided
checkers' tier-restriction logic (`legalGetWrite`, `matching`/`matches`,
`entry.path`/`event.path`) shows the same class of defect recurring in two
fresh, independently written submissions:

- **Trial 8's `checker.mjs`** builds its get-write legality check around
  `matches(entry, event)`, which requires `entry.path === event.path`, and a
  `derivedFromCopy(entry, source, event)` helper that — whenever the copied
  entry's headers don't already equal the source's exactly — falls back to
  requiring `matches(source, event)`, i.e. the *copy source* must match the
  *current* event's path. On top of that, the write-legality loop itself
  disqualifies any added entry outright when `entry.path !== event.path`
  (the branch that raises `"get ${event.id} stored a fabricated or
  non-storable entry"` — precisely the observed reason above). A copy of an
  edge-a entry for path `/asset` during a `get` for path `/revalidate` fails
  this gate before any legitimacy check even runs, purely because the two
  paths differ.
- **Trial 9's `checker.mjs`** reaches the same outcome through its own
  `legalGetWrite(before, after, state, event, derived)`: candidate copies come
  from `possibleCopyReps(state, event)`, which is itself filtered by
  `matches(entry, event)` (also requiring `entry.path === event.path`), and
  `legalGetWrite` applies `entry.path === event.path` a second time as an
  explicit filter on `choices`. No candidate whose path differs from the
  active event's path can ever appear in `choices`, so `legalGetWrite` returns
  false and the checker raises `` `illegal cache write to ${tier}` `` —
  precisely the observed reason above.

Both fresh checkers therefore impose the same unrequested restriction: they
tie a cache write's legality to the specific event/path currently being
served, rather than allowing a legitimate cross-tier copy of an
already-cached entry for a path other than the one the active request is
for. The contract permits exactly this kind of copy and requires preserving
unrelated entries; it does not impose an active-path-only copying
restriction — the same conclusion the Trial 6/7 audit above reached about the
voided submissions, now independently re-derived from two brand-new
submissions' source.

State this plainly: **this is now the third and fourth independent Codex
submission — across the voided Trials 6 and 7 and these two fresh
replacements — to reject this exact same class of valid tier-copy behavior.
Four for four**, even though two of those four (Trials 6 and 7) were voided
from the official count rather than counted as failures.

### Final classification for this package — six-run set closed at 6/6

This package's six-run set is now closed, with the exact void/replacement
accounting stated precisely:

**T2 = 0 (Claude) · T3 = 0 (Claude) · T4 = 0 (Claude) · T5 = 0 (Codex,
effective; recorded 1) · Trial 8 = 0 (Codex, replacing VOIDED Trial 6) ·
Trial 9 = 0 (Codex, replacing VOIDED Trial 7) = 6 counted failures out of 6
counted trials**, with exactly **3 Claude + 3 Codex** counted attempts.

| Trial | Provider | Original reward | Cumulative v3 diagnostic reward | Counted reward |
| --- | --- | --- | --- | --- |
| 2 | claude | 0 | 0 | 0 |
| 3 | claude | 0 | 0 | 0 |
| 4 | claude | 0 | 0 | 0 |
| 5 | codex | 1 | 0 | 0 |
| 6 | codex | 1 | 0 | **VOID — null (unscored)** |
| 7 | codex | 1 | 0 | **VOID — null (unscored)** |
| 8 (replaces void 6) | codex | 1 | 0 | 0 |
| 9 (replaces void 7) | codex | 1 | 0 | 0 |

Trials 6 and 7 remain **permanently VOID** in the record — original reward 1,
diagnostic v3 regrade 0, counted reward null for both — neither counted as a
pass nor a failure, and never overwritten or renumbered. This package's
six-run set now decisively **MEETS** the reported "at least 5 failures out of
6" threshold, at **6/6**.

### Evidence

Raw evidence for these trials remains at
`.local/three-replacements-2026-09-09/variant-cache-repair/trial-8/real-campaign-frozen/jobs/real-provider/records/variant-cache-repair-attempt-1/`
and
`.local/three-replacements-2026-09-09/variant-cache-repair/trial-9/real-campaign-frozen/jobs/real-provider/records/variant-cache-repair-attempt-1/`,
each with `grading/submission/entry.mjs` and `grading/submission/checker.mjs`
holding that trial's actual submitted code, `grading/result.json` and
`grading/checker-grade/grade-summary.json` the base-grade results. All prior
Trial 1–7 sections and both earlier audit sections above are preserved
unchanged.

[Full audit](../remaining-pass-audit-2026-09-09.md) ·
[Verified evidence](../evidence/2026-09-09-remaining-pass-audit.json) ·
[User-selected counting disposition](../evidence/2026-09-09-three-replacement-disposition.json).

This is an exploratory repository assessment. The Trial 8 and Trial 9 results
still record `adjudication: unlabelled`, `modelEvidenceEligible: false` and
`countsAsModelFailure: false`; nothing above claims official cheat
qualification or independent blind review. It does state, without
qualification, that this package's complete six-run set is now closed at
6 counted failures out of 6 counted trials.
