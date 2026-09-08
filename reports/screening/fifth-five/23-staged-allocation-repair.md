# 23 — Staged allocation repair

## Outcome

Claude, requested Opus 5 / max, completed in **18 minutes 11 seconds**, with **reward 1**.
The service passed **41/41 protected scenarios**. Its checker passed **13/13 candidates**,
accepting both correct implementations and rejecting all eleven negative controls with
a genuinely failed public obligation named. Repeated verdicts were deterministic,
and no execution error or retry was recorded.

## What the task was, in plain English

A resource allocator makes irrevocable placements as requests arrive. It sees the
complete tree of possible future requests, but not which branch will actually occur.
Every placement promises that all declared future branches remain possible: whichever
child arrives, there must still be some valid sequence of later placements.

Requests combine capacity, tags, minimum zone diversity, exclusions against ancestors'
chosen resources and zone sharing with an ancestor. Pre-existing occupancy cannot be
released, and a later placement cannot undo an earlier acceptance. Sibling branches
are alternatives, not work that must all fit simultaneously.

The crucial distinction is local feasibility versus a policy that remains feasible
after every possible next disclosure. The tree is small and complete, so this is a
bounded search problem, not guessing an inaccessible future.

## What was in the package

The starter already contained resource indexing, local-option generation, capacity
consumption and a service loop that places before advancing. Public semantics state
the recursive promise precisely. A separate checker receives the complete original
resource/tree view, actual allocations and the observed disclosure/placement order.
The host records semantically bad placements instead of protecting the agent from them.

There are 41 protected service scenarios and thirteen checker candidates. Before this
run, a combined-constraint example was corrected to activate its narrow zone, exclusion
and sharing controls; its predecessor hash was preserved. Completion at an already
disclosed leaf no longer required a redundant read returning null. Both changes were
validated before dispatch, not selected after inspecting this submission.

## What the agent actually did

The capture contains 39 shell calls. The only modified service file is
`src/policy.mjs`. It also added the standalone checker and three regression tests.

The starter chose `options(...)[0]`: the first locally legal placement. Claude replaced
that with a recursive predicate. For a candidate placement, consume its resources and
record its ancestor choice; then require every child to have at least one recursively
preserving placement. Each sibling is evaluated from the same post-parent state, so
the search does not incorrectly reserve resources for alternative futures together.

The resulting policy module is **fifteen lines**, reusing the existing correct local
constraint generator. The fallback to a locally valid option is unreachable on a
contract-valid root and a sequence of promise-preserving choices; it is not evidence
of a hidden failure under the supplied guarantees.

The new retained tests show a greedy placement using the sole resource its child needs,
the need to preserve both alternative branches, and pre-existing occupancy that must
be included in future feasibility. Captured testing confirms those three tests fail
against the original policy and pass against the repair. The final suite is **4/4**.

Beyond that, the agent built temporary generators and an adversarial disclosure host
that chooses a child stranded by the current placement. Its captured validation reports
14,000 randomized repaired-service runs with no failures, while the original policy
fails 1,618 of a 4,000-run comparison. These are self-generated measurements, not a
new hidden bank or a target-model replication count.

## How it checked its checker

The checker independently reconstructs placements and ordering from external traces,
then validates local constraints, immutable consumption, completion and the remaining
future promise. It does not consult the submitted diagnostic report.

Its own battery includes two correct implementations, one of which precomputes a
complete policy and prefers the last valid option, and sixteen incorrect variants.
It also exercises correct trace-shape variations, deep-frozen inputs and repeated
calls. A final captured battery reports no failures across eighty generated scenarios
and 240 cells per candidate. Larger correct-case and stress sweeps are additional
self-tests, not the protected grading denominator.

One particularly good test isolates **only** the broken promise: the submission strands
one declared child, but the host actually reveals the surviving child. All realized
placements can therefore succeed while the earlier acceptance was still illegal.
This checks the obligation directly rather than relying on downstream failure to
reveal it. It is a useful construction technique to transfer to other domains.

The final checker also accepts a correct program stopping at a disclosed leaf and
rejects publishing before disclosure. The former agrees with the preflight completion
repair; the latter follows the visible sequencing requirement. It does not demand the
author reference's exact resource order or chosen policy.

## Why this was not a hardness success

The public rules give the exact quantifier structure: every child must have some
preserving continuation. The starter already computes all locally valid choices.
The service repair is therefore a direct recursive composition of supplied functions
over at most six resources and nine nodes. Most trial time went into checker
construction and validation, not discovering a difficult planning abstraction.

That does not make the task invalid. It means this version's hypothesized difficulty
did not materialize against this model. The solution, independent alternative and
promise-only test should all be retained as positive construction evidence.

For a successor, investigate a materially richer professional planning workflow rather
than adding arbitrary constraints to the same tiny quantified search. If using larger
bounds, establish a credible efficient solution and an explicit product need first.
Enumeration and precomputation must remain legal whenever they meet the contract.
Do not hide future branches, demand one chosen allocation, or introduce timeout-only
difficulty to manufacture a failure.

## Evidence and limits

[Sanitized batch evidence](../evidence/2026-09-08-fifth-five.json) preserves timing,
original reward, service/checker results, exact reason policy, changes and capture
hashes. Temporary self-test code survives in captured commands; the submitted policy,
checker and four tests are retained. This is one exploratory pass, not universal
correctness, official qualification or backend attestation. The analysis describes
observable tools and artifacts rather than private internal reasoning.

## Changes applied since this trial (2026-09-08)

All three reviewers independently recommended no package change for #23 — the reward-1
result and clean 13/13 checker classification stand as genuine evidence of a well-built
package. No SEMANTICS.md-supported defect was found, and none is introduced here.

**One latent leniency bug was found and fixed, proactively, in the frozen dispatch tree
this trial ran against.** While auditing all five batch-5 packages for cross-tree
consistency, `private/domain.mjs`'s `completion` check in
`screening/2026-09-08-batches-3-5/source-fifth-v2` read
`index >= s.path.length - 1 && actual.length === s.path.length`, one step short of the
canonical development tree's `index >= s.path.length`. Given this task's `next()`
(`index++; return s.path[index] ?? null`, starting at `index = -1`), `index` only
reaches `s.path.length` after a candidate has actually called `next()` past the last
real element and observed the terminal `null` — the `- 1` variant granted completion
credit one call early, without ever requiring the candidate to observe genuine
exhaustion. This is the same "did input actually drain" pattern found and fixed
elsewhere in this batch (#21, #24).

**No control in the manifest exercised this exact boundary**, so it produced no
observed misgrading in this trial: a free regrade of the real preserved checker scores
identically before and after the fix (**13/13 correct, 0 false positives, 0 missed,
pass: true** either way). The fix was applied to `source-fifth-v2` only (the canonical
tree already had the stricter form) and verified via real Docker build+validate
(`local-valid: true`). This closes a latent gap a future candidate or checker could
otherwise have exploited; it is not evidence of any defect in this submission. **When
trials run again:** #23 should continue to score exactly as it did here.
