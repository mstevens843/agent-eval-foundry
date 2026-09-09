# 08 — Partial release repair

Completed one Claude attempt, requested Opus 5 / max. Recorded reward **0**. Authoring **20m 25s**; service **33/33** scenarios; checker **11/11 binary classifications correct**. Both correct alternatives accepted, all nine bad candidates rejected. Zero exact-label matches caused the recorded failure.

## What the task was, in plain English

Repair a client bringing a partly applied resource graph to a requested release. Replacing a parent can require temporarily removing children and then restoring them. A create or remove may return UNKNOWN even though its effect happened. The client must use current authoritative state or eventual receipts to resolve that uncertainty, make only legal dependency-ordered requests, finish the entire target, and preserve other applications' resources.

## What was in the frozen package

Four starter modules (graph, plan, release and transport), two visible test files, and the instruction/API/semantics/checker documents. The public bounds allow at most 40 resources and depth eight; graphs are feasible and acyclic. Receipts return PENDING at most twice before DONE or ABSENT, and inspection remains authoritative throughout UNKNOWN.

The independent service suite covered 33 scenarios and completion, payload, dependency_order and preservation. Checker grading used two correct candidates plus nine negative controls. Both legal intermediate behavior and final state matter; a later repair cannot erase an earlier illegal request.

## Concrete repair and package interaction

Claude consolidated the client into entry.mjs and changed the old modules to re-export its functions. That is a permitted implementation strategy, not an automatic defect.

Its planner computed the descendant closure of resources requiring replacement, removed children before parents, and recreated parents before children. It repeatedly inspected the current graph and chose a presently legal next operation, rather than trusting a stale initial plan. It polled bounded receipts, metered API use below the published cap, and returned completion based on the actual final graph. This resolved both partial effects and restoration requirements in the service suite.

The agent also built substantial checking machinery. Captured commands include a 3,000-case graph fuzz invocation and repeated candidate/checker fuzz exercises. Invocation counts describe its own testing, not additional independent hidden scenarios.

## What the agent did and what grading observed

Claude repaired the release workflow and supporting graph, planning, transport and release modules, added checker.mjs and changed a visible test. Source delta is recorded separately from tool events because shell writes also change files.

The transcript contains 34 Bash calls, 10 Edit calls and two Write calls. Observable checking included a self-built host, candidate bank, graph fuzzing, repeated checker fuzzing, stress runs and cross-process determinism checks. These are observed commands, not independent certification that every self-test was correct. The external verifier—not edited local tests—accepted every service scenario.

The service successfully completed the graph transformation under partial effects, dependency ordering and uncertainty. The checker also identified every candidate correctly.

## Why reward was zero—and why this is not a hardness win

The checker returns explanatory strings such as “completion: scoped id … is absent” and “dependency_order: …”. Every rejected candidate's explanation starts with the expected public check name.

The frozen grader uses reasons.includes(expectedFailingCheck), which requires a whole array element to equal “completion”, not a sentence starting with it. The public instruction asks for a reasons entry that names the violated obligation, and CHECKER-INPUT.md says reasons must include the public check name. Neither clearly specifies that explanatory suffixes are forbidden.

Read-only analysis of the reproduced output confirms **all nine** expected labels appear as explanatory prefixes. The only observed failing gate is exact string equality. No service or binary-checking defect is established. Treat this as a **contract/grader alignment concern**, not clean evidence of model reasoning failure.

## Required next-version repair

Define a structured schema explicitly: for example a separate check ID and explanatory message, or documented exact identifier elements plus optional explanation fields. Make public examples and local interface tests match it. Add a regression accepting informative explanations in the chosen supported format. Do not retain this mismatch as a difficulty mechanism.

After that repair, regrade these same preserved bytes under a separately versioned diagnostic if useful; do not overwrite this result or count the diagnostic as a new model trial. New hardness work should target real graph-planning obligations, not reason formatting.


## Evidence and publication limits

[Sanitized trial record](../evidence/2026-09-08-next-five.json) includes package/profile hashes, submitted-file deltas, observed settings, independent service and checker counts, and hashes of the retained completion manifest and grade. All files listed by that manifest were hash-verified during publication. [Batch index](../README.md) explains the evidence boundary.

The raw transcript and full submitted workspace remain in restricted local storage; this is an editorial analysis of the recorded actions and artifacts, not a publication of private internal reasoning or independently blind-adjudicated evidence. The current [task source](../../../tasks/partial-release-repair/) may have a different build identity. Suggestions are for a new version, not changes to the original result. Self-authored tests, independent service scenarios and checker candidates have different denominators.

## Changes applied since this trial (2026-09-08)

This report's diagnosis was exact: the frozen grader required a whole `reasons` array element to equal the check name, while every rejected candidate's explanation legitimately led with it as a prefix.

**Fix applied**, in the working `.local/post-program/next-five/2026-09-07-p09/source` tree (not this repo's root-level [task source](../../../tasks/partial-release-repair/)): the checker grader now accepts a `reasons` entry that either equals the check id exactly or leads with `"checkId:"` as a prefix. This is a harness change — no scenario, control or reference file for this task was touched.

**Regrade performed exactly as this report requested** — the same preserved submission bytes, under a separately versioned diagnostic, not overwriting this result or counting as a new trial. Re-run against the fixed harness with zero new model calls: now scores as a full pass (11/11 correct, 0 false positives, 0 missed, all 9 controls correctly named). This is the confirmed fix — the "contract/grader alignment concern" this report identified is resolved. Full numbers: restricted regrade record `regrade-2026-09-08.json` (restricted local storage, same evidence boundary as the sanitized trial record above).

**When trials run again:** a fresh attempt against this package should now score correctly on checker grading if it produces reasons in this same explanatory-prefix style.

## 2026-09-09 — Third ranked group: engineering successor for Trial 2

**Ready for a second exploratory trial. No new model attempt was launched for this version.** Priority within the third ranked group: 2/5. Earlier sections describe historical source and results. See the [implementation report](../third-ranked-five-implementation-plan-2026-09-09.md) and [hashed validation evidence](../evidence/2026-09-09-third-ranked-five-implementation.json).

Completed both private service closures, removed all four public implementation modules and old tests importing them, and supplied an empty service entry point. Removed worked dependency/uncertainty and rejection-label explanations from the instruction. The resource, API and checker schemas remain available.

Reason text is now diagnostic only; the previous exact-label disagreement is not a success criterion in this successor. Kept the maintained initialResources, requestedScope and requestedTarget inputs, which the local successor did not fully retain. Removed the computed valid/scope annotations from operation records; the independent checker evaluates the raw before-state and attempted operation.

Aligned idempotent creation with the existing statement that parent lists are sets: duplicate list entries no longer cause an otherwise equivalent resource to be rejected. A regression accepts that legal alternative and rejects an illegal parent removal even when the final graph remains correct. All 33 existing scenarios remain; no hidden crash, concurrent edit or unavailable-receipt obligation was introduced.

Validation passed 14 Foundry assurance checks across 33 scenarios, including the complete reference and alternative services, semantic failure of the untouched service starter, repeatability and control activation. The private checker correctly classified 11/11 candidates: two correct implementations and 9 negative controls, with zero false accepts or misses. Rebuild and fresh recipient reproduction passed.

Native validation passed all 22 static checks and six verifier integrity controls. Harbor's complete oracle returned reward 1; nop returned reward 0, with no Harbor exceptions or verifier infrastructure errors. Nop is rejected for its missing checker deliverable; the separate Foundry starter execution establishes the service's semantic failure. These are provider-free local validation jobs, not new standard/cheat model trials.

Use these exact exports:

- Foundry: `.local/third-ranked-five-implementation-2026-09-09/release-ready/partial-release-repair/export`
- Foundry digest: `5c5b111476f3f48d97db15dac6bb165b0076f8c4363acd0899e434877b709387`
- Native Harbor: `.local/third-ranked-five-implementation-2026-09-09/harbor-ready/partial-release-repair`
- Native digest: `a099f591f32003dee69235a565046eca248dca79e39d45c41b3b6623b090bc5c`

Both deliverables are required. The checker returns complete deterministic Boolean verdicts; optional reason text does not affect grading, and submitted helper modules are available. Public requirements and custom schemas remain supplied without a worked implementation.

When Trial 2 completes, append the actual model/profile, frozen digest, service/checker outcomes, elapsed time, exclusions and final submission defect here. Keep original Trial 1 rewards intact. Local controls, old grading disputes and infrastructure errors are not additional model failures. The final hiring submission still requires its human-authored material and rubric, standard and cheat qualification on the final selected version.
