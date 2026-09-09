# 19 — Variant cache repair

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
