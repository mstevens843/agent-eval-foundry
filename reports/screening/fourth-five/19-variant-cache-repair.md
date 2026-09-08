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
