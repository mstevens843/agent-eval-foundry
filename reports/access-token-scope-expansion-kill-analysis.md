# Kill analysis — Access token scope expansion

`access-token-scope-expansion` · verdict **NOT-READY** · primary reason **`already_solved`** · disposition **`harden`**

Every finding below is derived from a gate result or a trial record. Nothing here is an opinion.

## What this family tested

The hidden suite samples the declared access-token state space: approval drift, token drift, cache freshness, request surface, repeat count and seed. Hidden scenarios add no rule beyond exact current approval/token binding and duplicate-effect prevention.

It targets `permission-boundary`, `stale-state`, `false-audit-history` across a declared space of 6 knobs.

## What it proved

| claim | evidence | status |
|---|---|---|
| The reference is solvable | reference sweep over every graded scenario | **proved** |
| The verifier discriminates | 8 of 8 mutants caught by the check each was written to trip | **proved** |
| Trivial strategies lose | 2 of 2 baselines rejected | **proved** |
| Scenarios exercise their mechanism | every attack blocks on its governing rule | **proved** |
| Real models can be graded on it | 1 counted agent trial(s) under subprocess isolation, artifacts preserved | **proved** |

## What it did **not** prove

**That it is hard.** All 1 counted agent trials passed every graded scenario. The
submissions were genuine implementations, not refusals or stubs — which makes this a
measurement rather than a harness failure, and the measurement is that the task is easy for
the models it was built to separate.

A clean smoke pass is useful evidence. It prevents wasting a `/6` matrix and routes the family into evolution.

It also did not prove the opposite: 1 counted clean pass by the available model family is a signal, not a proof about every provider. What it forecloses is *shipping on the current evidence*.

### The trials

| run | model | runtime | scenarios | failed | isolation |
|---|---|---:|---:|---:|---|
| `access-token-2026-08-o1` | openai/gpt-5.6-sol | 260s | 384 | 0 | subprocess |

## Why it is not ready

Blocking gates failing: `not-already-solved`.

Advisory gates failing: `shared-bank-ready`.

## Findings

### `already_solved` — weakness, derived

Every counted agent trial passed cleanly. Whatever the verifier can detect, no subject in this bank exhibits it.

**Disposition:** `harden`. **Evidence required:** at least one counted agent trial, and every one of them passing.

| evidence |
|---|
| 1 counted agent trial(s), 1 of them passing every graded scenario |
| isolation: subprocess |

Supporting gates: `not-already-solved`.

### `insufficient_shared_bank` — absence, derived

Too few subjects have attempted this family and another, so its axes cannot be compared with any other family's.

**Disposition:** `schedule`. **Evidence required:** a shared-subject count below the threshold.

| evidence |
|---|
| 1 subject(s) shared with another family (need 3) |

Supporting gates: `shared-bank-ready`.

## Which of these it is

The question a postmortem has to answer and usually dodges: is the problem the task, the models,
the spec, the data, or the absence of evidence? Each row is a hypothesis with a test attached.

| hypothesis | verdict here | how it was decided |
|---|---|---|
| **Task weakness** — the family is too easy | **yes, primary** | counted trials all passing |
| **Model strength** — the models are simply good at this | contributory | the submissions were real implementations citing the rules, not lucky guesses. That is a fact about the models AND about the task: the task did not distinguish them. |
| **Policy explicitness** — the spec gave away the answer | likely contributory | the published rule order made attribution a lookup rather than a derivation. `reduce_policy_explicitness` is the operator that tests this directly. |
| **Synthetic data** — the fixtures are too clean to transfer | unmeasured | scenarios are single-turn and fully observable; nothing has tested whether a pass transfers to a longer, noisier setting |
| **Lack of trial evidence** — nothing has attempted it | no — trials exist | 1 counted trials |

## What would make it stronger

The evolution engine proposes the following, each a composition of named operators rather than
a fresh idea. Kill risk is the pre-registered probability that the variant dies of the same
cause as its parent.

| variant | operators | new mechanisms | axes | kill risk | build h |
|---|---|---|---:|---:|---:|
| `access-token-delegated-wallet-scope-reconciliation` | `add_time_separation`, `add_durable_state`, `add_delegation_chain`, `add_scope_downgrade_or_revocation`, `add_authoritative_reconciliation`, `add_audit_truth_requirement`, `add_liveness_pressure` | `duplicate-side-effects`, `liveness-stall`, `tool-result-ambiguity`, `uncertain-external-effects` | 4 | 35% | 36 |
| `access-token-stale-delegated-authority-outbox` | `add_time_separation`, `add_durable_state`, `add_authoritative_reconciliation`, `add_scope_downgrade_or_revocation`, `add_audit_truth_requirement` | `uncertain-external-effects`, `duplicate-side-effects` | 3 | 45% | 32 |
| `access-token-delegated-token-cross-tool-execution` | `add_delegation_chain`, `add_cross_tool_interaction`, `add_partial_observability`, `add_scope_downgrade_or_revocation`, `add_liveness_pressure` | `tool-result-ambiguity`, `liveness-stall` | 3 | 50% | 28 |
| `access-token-authorization-downgrade-liveness` | `add_durable_state`, `add_scope_downgrade_or_revocation`, `add_audit_truth_requirement`, `add_liveness_pressure` | `liveness-stall` | 2 | 55% | 22 |

See `reports/foundry-evolution-report.md` for each variant in full.

## Next actions

1. Evolve the family with hardening operators — the mechanism is intact and the difficulty is not.
2. Schedule infrastructure work: Too few subjects have attempted this family and another, so cross-family axes are unmeasurable.

## The taxonomy this was graded against

Reasons not found here are as informative as the one that was. A family that dies of
`already_solved` is a different problem from one that dies of `no_mechanism_fire`, and the
disposition column is why the distinction is worth keeping.

| reason | kind | disposition | found here |
|---|---|---|---|
| `already_solved` | weakness | `harden` | **yes** |
| `verifier_only` | absence | `trial` | no |
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
