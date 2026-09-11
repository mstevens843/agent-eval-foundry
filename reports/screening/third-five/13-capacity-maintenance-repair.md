# 13 — Capacity maintenance repair

One Claude attempt, requested Opus 5 / max. Authoring **24m 26s**. Recorded reward **1**: service **138/138 scenarios**, checker **12/12 candidates**. Both correct implementations were accepted and all ten negative controls rejected with the required obligation named. No trial execution error or retry was recorded.

## What the task was, in plain English

Repair Cedar, a fleet-maintenance planner. Every requested host must be emptied and upgraded, dependencies must be respected, and the fleet must return to its original placement afterward. Throughout the entire operation, service availability, weighted host capacity, eligible placements and per-zone limits must remain valid.

The host does not quietly prevent capacity or availability violations. A bad removal can succeed operationally while breaking the product's safety rules. The independent grader checks every intermediate state as well as the final one. Doing no maintenance, or completing upgrades but abandoning the original placement, cannot pass.

## What was in the frozen package

Four starter modules, a bounded public fleet/API contract, one visible test and explicit checker-input documentation. There are at most six hosts, three services and three requested hosts. Inputs are initially valid and have an attainable plan within sixty successful operations.

The service suite has 138 scenarios and six obligations: completion, capacity, availability, placement, restoration and legal operations. Checker grading uses a reference, a correct alternative and ten negative controls over four selected scenarios each. Fresh preflight removed precomputed safety verdicts from the checker-visible history; the checker receives placements, completed-host state, original requirements and actual operation records instead.

## What Claude actually repaired

The starter already used breadth-first search. It was not missing the concept of state-space planning. Its problems were the model and goal: capacity counted instances instead of summing their sizes, per-zone limits were absent, and search stopped once all upgrades were done without requiring restoration.

Claude replaced the planner with an indexed bitmask representation and complete breadth-first search over both placement and completed upgrades. The target now requires all requested upgrades **and** the original placement. For an add/remove successor, it updates the affected host load, service count, zone count and eligibility contribution instead of rechecking every unrelated condition.

It also kept a simpler, separately expressed admissibility check. The coordinator walks a proposed plan through that check before executing it, verifies each acknowledged operation, reads authoritative state again and finishes only when the restoration goal holds. The new model module uses typed arrays and explicit state indices. The service no longer relies on an attractive final state to excuse an invalid intermediate step.

## What happened during self-verification

The capture records 46 Bash requests and a substantial set of retained test helpers. Some early commands were rejected by the CLI because they contained a literal control character; the agent corrected the encoding and continued. These recovered authoring mistakes are not failed trial executions.

It compared the optimized planner with a straightforward, separately written search over 300 generated fleets and checked plan lengths as well as solvability. Some initial hand-built tests were themselves unsolvable; it corrected their fixture capacities/placements rather than weakening the safety rules. The final recorded run is **23 passing tests**.

The checker tests go beyond its own preferred solution. They include correct detours and extra reads, mixed good/bad candidates, repeated invocation without input mutation, misleading diagnostic reports, intermediate violations repaired before the final state, and a separately written audit of individual traces. An early placement-blind mutation was not activated by its first random corpus; it added concrete distinguishing fleets. This is the same practical lesson our construction process needs: a named mutation is not evidence until a scenario actually exposes it.

The agent also measured its own optimized search. One maximal-fleet probe reported a 21-operation plan in 282 milliseconds; a broader stress output reported zero failures and a maximum of 26 API calls. These are self-measurements from tool output, not independently reproduced performance benchmarks. The independent protected grade is the separate 138/138 service result and 12/12 checker result.

## Why the package did not defeat this agent

The task genuinely requires safety and completion together, but its complete finite state is visible and small. The starter already points toward exhaustive search. Once the agent repaired the validity predicate and made restoration part of the search goal, satisfying both obligations became a normal graph-search problem rather than a dilemma left to informal judgment.

The important outcome is not merely that it found a plan. It checked the planner through a different representation and made its checker accept legal nonminimal plans. It did not repeat the earlier causal-replica mistake of turning its own implementation strategy into a requirement for all correct candidates.

## Useful improvements and limits

Retain weighted capacity, intermediate-state auditing, restoration and alternative-correct controls. Add distinguishing fixtures when a narrow mutation survives; do not assume a large random corpus activates every rule interaction. A future checker bank should vary legal plan order and harmless reads so shortest-path output never becomes an accidental grading requirement.

Simply increasing host counts until exhaustive search times out would not meet the project's fairness goal. A substantial successor would need professionally meaningful additional planning structure, an explicit attainable contract and an expert solution—not a larger opaque state space or an arbitrary ban on breadth-first search.

No model weakness was demonstrated here. This trial instead shows that a fully exposed small planning model, even with simultaneous safety and restoration requirements, can be implemented, optimized and independently checked in about twenty-four minutes.

## Evidence boundary

[Sanitized batch record](../evidence/2026-09-08-third-five.json) preserves frozen package/profile/source identities, original results, source deltas and verified manifest/result/grade hashes. [Current task source](../../../tasks/capacity-maintenance-repair/) may later evolve independently.

This is analysis of recorded actions, submitted code and grading artifacts, not private internal reasoning or an independently blind adjudication. Self-generated impossible fixtures were outside the graded solvability guarantee and are not model failures. No additional model calls or diagnostic regrades were performed for this report.

## 2026-09-09 — Third ranked group: engineering successor for Trial 2

**Ready for a second exploratory trial. No new model attempt was launched for this version.** Priority within the third ranked group: 1/5. Earlier sections describe historical source and results. See the [implementation report](../third-ranked-five-implementation-plan-2026-09-09.md) and [hashed validation evidence](../evidence/2026-09-09-third-ranked-five-implementation.json).

The public search implementation and supporting state/coordinator modules were removed after completing both private service closures. The agent now implements the planner from the fleet/API contract. Reasons are diagnostic only; the independent private checker reconstructs operations, intermediate safety, upgrade order and restoration without requiring a particular plan.

Fixed a concrete collector defect: the invariant Boolean named placement overwrote the actual placement array inside history. Safety verdicts now remain private, and checker-visible history contains actual placements and completed hosts. Corrected private state-key/counter handling for legal string identities and added an identity regression. The count-not-weight control received the same counter correction so its intended defect remains weighted capacity rather than an unrelated exception.

Removed 112 duplicate witnessing scenarios that had been added for an older checker-selection workaround. The 26 distinct original scenarios remain, plus the new identity case, for 27 total. Full assurance and fresh recipient reproduction still activate all ten negative controls with their clean witnesses. This reduces repeated author-side execution without claiming broader model difficulty from duplicate counts. The historical 138/138 result above is unchanged.

Validation passed 15 Foundry assurance checks across 27 scenarios, including the complete reference and alternative services, semantic failure of the untouched service starter, repeatability and control activation. The private checker correctly classified 12/12 candidates: two correct implementations and 10 negative controls, with zero false accepts or misses. Rebuild and fresh recipient reproduction passed.

Native validation passed all 22 static checks and six verifier integrity controls. Harbor's complete oracle returned reward 1; nop returned reward 0, with no Harbor exceptions or verifier infrastructure errors. Nop is rejected for its missing checker deliverable; the separate Foundry starter execution establishes the service's semantic failure. These are provider-free local validation jobs, not new standard/cheat model trials.

Use these exact exports:

- Foundry: `.local/third-ranked-five-implementation-2026-09-09/release-ready/capacity-maintenance-repair/export`
- Foundry digest: `6cf1ac0fcd0339cb51353a0c0dbdd267b501489d7db26faf8fcc7898d6f2a0be`
- Native Harbor: `.local/third-ranked-five-implementation-2026-09-09/harbor-ready/capacity-maintenance-repair`
- Native digest: `d7428c2b76d60da60236d03bc48bf1b85c6f0962525bd8056212d59df8a98cf6`

Both deliverables are required. The checker returns complete deterministic Boolean verdicts; optional reason text does not affect grading, and submitted helper modules are available. Public requirements and custom schemas remain supplied without a worked implementation.

When Trial 2 completes, append the actual model/profile, frozen digest, service/checker outcomes, elapsed time, exclusions and final submission defect here. Keep original Trial 1 rewards intact. Local controls, old grading disputes and infrastructure errors are not additional model failures. The final hiring submission still requires its human-authored material and rubric, standard and cheat qualification on the final selected version.

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `capacity-maintenance-repair-attempt-1`, package digest
`6cf1ac0fcd0339cb51353a0c0dbdd267b501489d7db26faf8fcc7898d6f2a0be`, route
`professional-multifile/authority-process@1`. Dispatched through this session's
`real-provider` execution route (signed JobStore reservation, Ed25519, realm
`real-provider`, `billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`)
— a fresh campaign slot (`attempt-1`), not an infrastructure retry. Campaign:
`.local/round-two-third-ranked-five-2026-09-09/`, controller `campaign.mjs`, an
independently-verified small adaptation of the prior campaign's controller,
importing the same isolated, byte-verified runtime built earlier this session
(`.local/round-two-top-five-2026-09-09/frozen-source/dist/index.js`). Author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`. Evidence
retained at `.local/round-two-third-ranked-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/capacity-maintenance-repair-attempt-1/`.

Target: **claude**. Requested `anthropic/claude-opus-5`, effort `max`, CLI
`scaffoldVersion 2.1.263` (verified baked into the pinned author image). Observed
from runtime events: `model="claude-opus-5"` (matches requested); effort and
scaffold version are not exposed by the CLI's event stream and remain unobserved.

Dispatched 2026-09-09T15:08:41.798Z as one of five reservations installed within a
231ms window (15:08:41.798Z–15:08:42.029Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently — a genuinely concurrent five-way
campaign. Completed 2026-09-09T15:27:17.327Z. Total elapsed ≈1,115,529ms (~18m36s)
— solver authoring time (capture wall clock) ≈1,108,416ms (~18m28s), grading ≈7.1s.
Token usage: 3,485,269 input tokens (3,361,544 cached), 97,981 output tokens; the
CLI's own `total_cost_usd` reports $5.37 — a metered-price estimate only, no actual
charge occurred since authorization was `subscription-only` with `maxMicroUsd: 0`.
Execution reached a clean `completed` state with no invalid-execution or
infrastructure error.

### B. What changed since Trial 1

Per the engineering-successor section above: the public search/state/coordinator
modules were removed after completing the private service closures, so this trial
started from the fleet/API contract alone rather than a substantially pre-implemented
starter. A collector defect (an invariant boolean overwriting the real placement
array in checker-visible history) was fixed; checker-visible history now carries
actual placements/completed hosts, safety verdicts stay private. 112 duplicate
witnessing scenarios were removed (138 service scenarios became 26 distinct
original cases plus one new identity case, 27 total), and checker reasons remain diagnostic-only.

### C. Results

**Reward 1 — a clean pass on both required deliverables**, consistent with Trial 1's
own clean pass on the pre-successor package. Service: all 27 expected scenarios
observed, zero failures, zero missing/unexpected IDs. Checker: `checkerRequired: true`,
`checkerPassed: true`, 12/12 candidates correctly classified (0 missed, 0 false
positives), deterministic across repeat judgments.

### D. Observable solving behavior

25 `Bash` calls captured. The agent read `SEMANTICS.md`, `api.d.ts`, `CHECKER-INPUT.md`,
the starter `entry.mjs` and `instruction.md` in three calls, then wrote a complete
`entry.mjs` in one shot: a bitmask state-space model — state = (placement bitmask over
host×service pairs, upgraded bitmask over requested hosts) — with a dense validity
table pre-screening all `2^(H·S)` placements against capacity/eligibility/min-max/
per-zone *before* BFS ever visits them, so the search can never enter a state that
would grade as a violation. The goal state requires both full upgrade completion and
restored original placement, so BFS's shortest-path property produces the
"add-elsewhere → remove → maintain → restore → clean up" temporary-relocation dance
automatically wherever a service's `min` leaves no slack — the agent did not hand-code
that dance as a special case.

It hit the same class of authoring friction Trial 1 recorded: a literal `\x00`
separator constant caused inconsistent encoding between `entry.mjs` and `checker.mjs`.
It diagnosed this with `grep`/`cat -A` byte inspection, then wrote a small Node script
(`fixsep.cjs`) to normalize both files programmatically rather than hand-editing raw
bytes — the same defect class recurring across two independent trials, self-corrected
both times without being a graded failure.

It then built an unusually layered self-test suite, all outside the graded package:
`run-subject.mjs` (standalone service fuzzer, escalated from 400 to 4,000 random
scenarios), `run-mutants.mjs` (300, later 1,200 scenarios × candidate set), `run-hard.mjs`
(3,000 scenarios), `run-edge.mjs`, `run-robust.mjs`, `run-rules.mjs` (per-rule isolation:
min/max/perZone/capacity/eligibility breaches each individually triggered and checked),
and `run-throughput.mjs` (40,000-cell timing under a 1 GiB cap). It patched its own
harness twice (`patch-harness.cjs`, `patch2.cjs`, `patch3.cjs`) to track strict-mode
rejections and fix an infeasible hand-built fixture — iterating on its *test tooling*,
not the submission's correctness logic. It closed with `node --check` on both files
and a full re-run of all seven test scripts in one sweep before declaring done.

Its final completion claim (3,480 feasible random scenarios; 328 "tight" scenarios
with 321 requiring temporary relocation; 13 candidates × 720 scenarios = 9,360 traces
with 0 false accepts/rejects; 40,000 cells checked twice in 525ms) matches the actual
graded result (27/27 service, 12/12 checker) — no overclaiming found.

### E. Comparison and next step

Trial 1 (pre-successor, substantially pre-implemented starter) also reached reward 1,
138/138 service, 12/12 checker, in 24m26s. Trial 2, working from the fleet/API contract
alone after the starter's search/state/coordinator modules were removed, reached the
same clean-pass outcome in less authoring time (18m28s) despite writing materially
more code from scratch — consistent with this being a stable, low-difficulty result for
this package/model pairing rather than one that depended on the removed starter
scaffolding. The recurring `\x00`-separator encoding friction across both trials is a
tooling quirk worth noting for future package authoring, not a capability signal.
Both trials were solved. Retain these submissions as correct controls and prioritize
packages with observed required-deliverable failures for the next difficulty-search
attempts; a solver pass is not a Foundry reward-zero success.

### F. Verified publication record — September 9, 2026

Reward **1**; service **27/27**; checker **12/12**. All **692** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-third-ranked-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-third-ranked-five.json). Trial 1 is preserved.

## September 11, 2026 — successor 2.0.0 engineering (no new model trial)

This is a new task version, not a regrade of the Trial 2 submission above, which
remains a correct clean pass against the earlier contract. Full rationale, the
obligation-to-coverage matrix, and cross-package validation results are recorded in
the [queue 11–15 successor report](../queue-eleven-fifteen-successors-2026-09-11.md);
this section summarizes only what is specific to this package.

**New business requirement.** Trial 1's own conclusion was that this package's
complete finite state is visible and small, and that maintenance duration being "one
atomic operation" is exactly why a flat BFS over (placement × done) could solve it
without any real planning structure. Version 2.0.0 removes that atomicity: placements
now carry a `provisioning`/`active` phase. `api.add` creates a provisioning placement
(consumes host capacity, does not yet count toward a service's availability/perZone);
a new `api.activate` promotes it to active; `api.remove` works on either phase;
`api.maintain` requires the target host to be empty of placements in *either* phase.
A new obligation, `readiness`, requires no placement remain provisioning at `finish`.
`public/package.json`'s version field (previously absent) is now `"2.0.0"`.

**Why the previous strategy fails.** Both the historical reference (global BFS with a
static admissibility pre-filter) and alternative (local per-host relocation BFS)
treated `add` as instantly counting toward availability — a solver ported unchanged
onto 2.0.0 fails the very first multi-service relocation the moment it removes an old
placement before activating its replacement. Reimplementing the historical planner's
exact flat-state search over the new three-phase-per-slot space was also verified to
be combinatorially infeasible at the declared 6-host/3-service bound (a real,
observed multi-minute hang during implementation); the new reference instead
decomposes into a per-request local-search planner.

**Validation.** 27 scenarios (unchanged base fixture set) grew to 29 (one new
identity-adjacent case exercising the phase split at declared scale); 10 controls
grew to 13 (three new: `credits-provisioning`, `capacity-active-only`,
`premature-finish`, plus `remove-before-replacement`'s exploit logic rewritten for
the new phase semantics — see the coverage matrix in the linked report for exactly
which obligation each targets). Local dry-run: reference and alternative both 0
failures; all 13 controls trip their declared check with their `clean` witness
respected; checker 15/15 correct, deterministic, non-mutating. Native Harbor (real
Docker, `--validate`): oracle reward 1 (service 29/29, checker 15/15, all 5 integrity
checks pass), nop reward 0 (missing required deliverable, not an infrastructure
error). Local Foundry (`buildPortfolioPackage`/`validatePortfolioPackage`): 18/18
operations pass, `local-valid` and `trial-eligible` both allowed. Native export
digest `860613db732205aaa9f546c17bbf6967e5d0c7782739dc2814336f2d57d3565b`.

No model trial has been run against this version; per the implementation standards,
the Trial 1/Trial 2 reward counts above do not carry forward to it. This work was
done in an isolated worktree/branch (`next-five-successors-2026-09-11`) and has not
been merged, committed to `main`, or pushed.


## September 11 independent grader audit

The [independent audit](../queue-eleven-fifteen-checker-audit-2026-09-11.md) reproduced and fixed false accepts, false rejects,
API inconsistencies and checker-coverage gaps in the five-package successor handoff.
Its exact audited versions and export digests supersede this document's earlier readiness
claims for those bytes. The final audit passed 4,146 individual-cell comparisons,
28 checker mutations against both local and protected candidate banks, all 40 native
integrity checks and 105 Foundry assurance operations. No model trials were run, and
historical trial counts were not changed.
