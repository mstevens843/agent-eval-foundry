# Kill analysis — Access token scope expansion

`access-token-scope-expansion` · verdict **NOT-READY** · primary reason **`verifier_only`** · disposition **`trial`** · lineage decision **`re-measure`**

Every finding below is derived from a gate result or a trial record. Nothing here is an opinion.

## What this family tested

The hidden suite samples the declared access-token state space: approval drift, token drift, cache freshness, request surface, repeat count and seed. Hidden scenarios add no rule beyond exact current approval/token binding and duplicate-effect prevention.

It targets `permission-boundary`, `stale-state`, `false-audit-history` across a declared space of 6 knobs.

## What it proved

| claim | evidence | status |
|---|---|---|
| The reference is solvable | reference sweep over every graded scenario | **proved** |
| The verifier discriminates | 9 of 9 mutants caught by the check each was written to trip | **proved** |
| Trivial strategies lose | 2 of 2 baselines rejected | **proved** |
| Scenarios exercise their mechanism | every attack blocks on its governing rule | **proved** |

## What it did **not** prove

**That it is anything.** Every trial this family has is WITHDRAWN: each was graded against a
package this repository no longer produces, so none of them is evidence about the task as it
stands. That is not the same as never having been attempted — an attempt was made and paid
for — and it is not a difficulty reading in either direction. A clean pass against a package
that contained its own answer distinguishes nothing, and a failure against a package with a
defect in it measures the defect.

What those runs bought is the discovery that invalidated them. The family's status is UNKNOWN
until one counted trial exists under the current hash, and no routing decision — evolution,
matrix spend, lineage verdict — may be made on the withdrawn numbers.

## Lineage Learning

This family is part of lineage `access-token-authority-lineage`, which currently has verdict **`lineage_evidence_withdrawn`**.

Lineage reason: access-token-scope-expansion and delegated-wallet-scope-reconciliation withdrew the smoke evidence this lineage was judged on (package-leak), so the branch's difficulty is unknown - it is neither solved nor unmeasured.

Portfolio decision: run one counted smoke per node against the repaired current-hash packages before any verdict, portfolio adjustment or matrix decision is derived from this lineage.

Estimated matrix spend avoided by this lineage: $0.00.

The lineage does not currently override the single-family disposition.

### The trials

| run | evidence state | model | runtime | scenarios | failed | isolation |
|---|---|---|---:|---:|---:|---|
| `access-token-2026-08-o1` — **superseded** by the 2026-09-01 `access-token-scope-expansion` challenge migration; it does not count and its numbers are withdrawn | **superseded**; withdrawn | openai/gpt-5.6-sol | 260s | 384 | 0 | subprocess |

**Withdrawn evidence.** `access-token-2026-08-o1` was invalidated by the 2026-09-01 `access-token-scope-expansion` challenge migration: it was graded against a package this repository no longer produces, so that row does not count and every number on it is withdrawn. The trial record's own `counts` field is about grading and says nothing about whether the task still exists, which is exactly how an invalidated run was once presented as live evidence. Read this row as spend that was made, not as a result about the family as it stands.

## Why it is not ready

Blocking gates failing: `difficulty-evidenced`, `not-already-solved`.

Advisory gates failing: `shared-bank-ready`.

## Findings

### `verifier_only` — absence, derived

The verifier discriminates against implementations written alongside it. That is a fact about the verifier, and it is not evidence that the family is hard.

**Disposition:** `trial`. **Evidence required:** mutants caught by their intended checks, and zero counted agent trials.

| evidence |
|---|
| 9 of 9 mutants caught by their intended check |
| 0 counted agent trials |

Supporting gates: `difficulty-evidenced`.

### `insufficient_shared_bank` — absence, derived

Too few subjects have attempted this family and another, so its axes cannot be compared with any other family's.

**Disposition:** `schedule`. **Evidence required:** a shared-subject count below the threshold.

| evidence |
|---|
| 0 subject(s) shared with another family (need 3) |

Supporting gates: `shared-bank-ready`.

## Which of these it is

The question a postmortem has to answer and usually dodges: is the problem the task, the models,
the spec, the data, or the absence of evidence? Each row is a hypothesis with a test attached.

| hypothesis | verdict here | how it was decided |
|---|---|---|
| **Task weakness** — the family is too easy | no | counted trials all passing |
| **Model strength** — the models are simply good at this | contributory | the submissions were real implementations citing the rules, not lucky guesses. That is a fact about the models AND about the task: the task did not distinguish them. |
| **Policy explicitness** — the spec gave away the answer | likely contributory | the published rule order made attribution a lookup rather than a derivation. `reduce_policy_explicitness` is the operator that tests this directly. |
| **Synthetic data** — the fixtures are too clean to transfer | unmeasured | scenarios are single-turn and fully observable; nothing has tested whether a pass transfers to a longer, noisier setting |
| **Lack of trial evidence** — nothing has attempted it | **yes, by withdrawal** | 0 counted trials; 1 preserved and withdrawn, which is spend without evidence rather than an untried family |

## What would make it stronger

_No variants proposed: the disposition is not `harden` or `mutate`._

## Next actions

1. Run counted agent trials. Nothing else moves until difficulty is measured.
2. Schedule infrastructure work: Too few subjects have attempted this family and another, so cross-family axes are unmeasurable.

## The taxonomy this was graded against

Reasons not found here are as informative as the one that was. A family that dies of
`already_solved` is a different problem from one that dies of `no_mechanism_fire`, and the
disposition column is why the distinction is worth keeping.

| reason | kind | disposition | found here |
|---|---|---|---|
| `already_solved` | weakness | `harden` | no |
| `verifier_only` | absence | `trial` | **yes** |
| `redundant_axis` | weakness | `mutate` | no |
| `unfair_hidden_rule` | defect | `repair` | no |
| `hidden_artifact_leak` | defect | `repair` | no |
| `no_mechanism_fire` | defect | `repair` | no |
| `no_reference_solution` | defect | `repair` | no |
| `no_mutant_discrimination` | defect | `repair` | no |
| `no_difficulty_evidence` | absence | `trial` | no |
| `too_synthetic` | weakness | `mutate` | no |
| `too_expensive` | cost | `split` | no |
| `runner_unavailable` | absence | `schedule` | no |
| `insufficient_shared_bank` | absence | `schedule` | **yes** |
| `grader_gameable` | defect | `repair` | no |
| `ambiguous_truth_source` | defect | `repair` | no |

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
