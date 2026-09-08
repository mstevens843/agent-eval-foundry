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
