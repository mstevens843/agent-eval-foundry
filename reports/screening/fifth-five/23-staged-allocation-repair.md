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

## Trial 2 preparation — final group (2026-09-09)

**Ready for second exploratory trials through Foundry or native Harbor.** Removed the public catalog, option generator, policy implementation and service loop after completing the private service closures. Added an independent checker based on raw constraints and disclosure/write history. The alternative correct service stops at a disclosed leaf; a regression rejects a stranded unrealized branch even when the realized placements succeed. The earlier addendum’s redundant-terminal-read requirement is not adopted: the public leaf-completion rule and maintained grader permit stopping there.

Local validation passed **16 assurance checks**, including a semantic failure for the untouched starter. Its independent checker classifies **13/13 candidates** correctly; reason text is diagnostic. The final native export passed 22 static checks, Harbor oracle reward 1 and nop reward 0, with no infrastructure exceptions. Both export formats reproduce. No model attempt was launched by this engineering work.

Foundry export: `.local/final-five-implementation-2026-09-09/release-ready/staged-allocation-repair/export`. Package digest: `0afe425904375bbba305ded2589ff08432c37657e7459d9003f9f66a55fee8c5`. Native export: `.local/final-five-implementation-2026-09-09/harbor-ready/staged-allocation-repair`. Native digest: `477c19170e0bfcbf674b476e78e7d12dc4cb3a6fe098424f1d10514c4bc899a4`. Suggested target: **Claude**, retaining the original model family. Append the eventual Trial 2 outcome below this engineering record; preserve Trial 1.

[Implementation and completed checks](../final-five-implementation-plan-2026-09-09.md) · [Exact evidence](../evidence/2026-09-09-final-five-implementation.json).

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `staged-allocation-repair-attempt-1`, package digest
`0afe425904375bbba305ded2589ff08432c37657e7459d9003f9f66a55fee8c5`, route
`professional-multifile/authority-process@1`. Dispatched through the session's
`real-provider` execution route (signed JobStore reservation, Ed25519, realm
`real-provider`, `billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`)
— a fresh campaign slot (`attempt-1`), not a retry. Controller: an adaptation of the
third-ranked-five campaign's controller, importing the isolated runtime built and
independently verified earlier this session
(`.local/round-two-top-five-2026-09-09/frozen-source/dist/index.js`; its SHA-256 was
re-verified unchanged immediately before this dispatch). Author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`. Evidence
retained at
`.local/round-two-final-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/staged-allocation-repair-attempt-1/`.

Target: **claude**. Requested `anthropic/claude-opus-5`, effort `max`, CLI
`scaffoldVersion 2.1.263` (verified baked into the pinned author image). Observed
from runtime events: `model="claude-opus-5"` (matches requested); effort and
scaffold version are not exposed by the CLI's event stream and remain unobserved.

Dispatched 2026-09-09T17:31:23.079Z as one of five reservations installed within a
334ms window (17:31:23.079Z–17:31:23.413Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently, a genuinely concurrent five-way
campaign. A sixth job (`route-policy-repair`, a fresh retry of a package interrupted
in an earlier campaign) was separately authorized and dispatched roughly 102 seconds
later on the same host, reaching three Claude / three Codex attempts total this
round; that job is independent of this one and does not affect this execution's
validity. Completed 2026-09-09T17:51:13.447Z. Total elapsed ≈1,190,368ms (~19m50s)
— solver authoring time (capture wall clock) ≈1,179,773ms (~19m40s), grading ≈10.6s.
Token usage: 2,459,348 input tokens (2,339,912 cached), 98,249 output tokens; the
CLI's own `total_cost_usd` reports $4.82 as a metered-price estimate only — no actual
charge occurred, since the signed authorization was `subscription-only` with
`maxMicroUsd: 0`. Execution reached a clean `completed` state with no invalid
execution or infrastructure error.

### B. What changed since Trial 1

Per the engineering record above ("Trial 2 preparation — final group"), the public
catalog, option generator, policy implementation and service loop were all removed
from the starter after Trial 1, leaving a single empty entry point; the checker is
now a required, separately-graded deliverable built independently rather than
diagnostic output. The redundant-terminal-read requirement from an earlier addendum
was explicitly not carried forward — the maintained grader permits stopping at an
already-disclosed leaf.

### C. Results

**Reward 1 — a clean pass on both required deliverables**, matching Trial 1's own
clean pass. Service: all 41 expected scenarios pass (`evaluateOutcome` complete,
`semantic-pass`, zero missing/unexpected IDs). Checker: `checkerRequired: true`,
`checkerPassed: true`, 13/13 candidates correctly classified — 0 missed, 0 false
positives, deterministic across repeat judgments. `reasonPolicy` is diagnostic-only
for this package; only the boolean verdict was graded.

### D. Observable solving behavior

The agent read every contract file first (`instruction.md`, `SEMANTICS.md`,
`api.d.ts`, `CHECKER-INPUT.md`, the empty `entry.mjs` starter, `package.json`) in
two shell calls, then wrote a shared domain module (`lib/model.mjs`) used by *both*
`entry.mjs` and `checker.mjs`, so the two deliverables cannot semantically drift
apart on what "feasible" means. That module's core is a recursive `feasible(nodeId,
capLeft, allocs)` function: an allocation for a node is acceptable only if it is
legal now **and** every child of that node remains recursively feasible under it —
directly implementing SEMANTICS.md's "existential over this choice, universal over
every possible future disclosure" requirement, rather than the starter's discarded
greedy first-legal-option approach.

`entry.mjs` loops `next({}) → choose → place({node, resources})` until the host
returns null, using the shared solver to make each choice; `checker.mjs` (409 lines)
independently rebuilds the realized timeline from the host's `observations` (with
`actual` as a fallback) and separately checks protocol validity (no double
placement, no allocation for an undisclosed node, no publishing before disclosure),
per-placement legality (units, tags, `minZones`, `antiWith`, `shareZoneWith`,
capacity), and safety — re-solving the game after each acceptance so a locally legal
but greedy choice fails even if the realized path happened to survive it.

Self-testing was extensive and is corroborated by the raw capture, not just claimed:
`npm test` ran two suites totaling 9,064 assertions (all passing), and the agent's
final report describes a 7-seed sweep of 3,224 service executions cross-checked
against an independently-written naive transcription of the semantics
(`tests/reference.mjs`, which also cross-checks the solver on 5,876 mid-run states),
plus 54,808 mutant-cell comparisons across 17 deliberately-broken services — the
checker's verdict matched an independent judge on every one, catching 41,416 genuine
violations while correctly accepting 3 mutants that are actually valid services in
disguise (a shape error that self-corrects, reordered resources, no trailing
`next`). It also ran a determinism check (2,100 cases judged twice in-process,
byte-identical output, ~49ms against a 60s budget) and fed degenerate inputs
(missing `cases`, null cells, no view) to confirm the checker returns verdicts
rather than throwing. The agent explicitly flagged two of its own interpretive
judgment calls in its final report — how it treats a run that stops at an internal
node without the host returning null, and what counts as a duplicate `place` for
the same node — as readings of ambiguous spec lines rather than certainties. The
final completion claim ("Both deliverables are implemented and validated") matches
the actual grading exactly; no overclaiming found.

### E. Comparison and next step

Trial 1, working from a starter that already supplied resource indexing, local
option generation and the service loop, needed only a 15-line recursive policy
change and reached reward 1 with checker 13/13 in 18m11s, spending most of its
effort on checker construction rather than the service. Trial 2, working from an
empty starter and writing the full shared model, service and a substantially larger
independent checker from scratch, reached the identical clean-pass outcome in
comparable wall-clock time (19m50s) with a materially larger self-test program
(54,808 mutant-cell comparisons vs. Trial 1's 240-cell-per-candidate battery).
Starter removal produced real additional authoring work here without changing the
outcome. Given two independent clean passes from the same model on two different
submissions, retain both submissions as correct controls and prioritize packages with observed
required-deliverable failures for further difficulty-search trials.

### F. Verified publication record — September 9, 2026

Reward **1**; service **41/41**; checker **13/13**. All **850** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-final-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-final-five.json). Earlier trial records are preserved.
