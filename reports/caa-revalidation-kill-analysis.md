# Kill analysis — Multi-name certificate authorization revalidation

`caa-revalidation` · verdict **NOT-READY** · primary reason **`already_solved`** · disposition **`harden`**

Every finding below is derived from a gate result or a trial record. Nothing here is an opinion.

## What this family tested

The hidden suite samples the declared seed, domain-count, age-pattern and denied-position space. The activated stratum contains the orders with two or more rechecked names, where identity collapse can fire at all; explicit one-name and single-recheck controls prove non-activation. Ages are drawn from the declared set 0, 8, 9, 24 and 719 hours, and a denied position always names a name that is actually rechecked. Hidden cases add no rule beyond the five visible ones.

It targets `stale-state`, `cardinality-preserved-identity-collapse` across a declared space of 4 knobs.

## What it proved

| claim | evidence | status |
|---|---|---|
| The reference is solvable | reference sweep over every graded scenario | **proved** |
| The verifier discriminates | 9 of 9 mutants caught by the check each was written to trip | **proved** |
| Trivial strategies lose | 1 of 1 baselines rejected | **proved** |
| Scenarios exercise their mechanism | every attack blocks on its governing rule | **proved** |
| Real models can be graded on it | 4 counted agent trial(s) under container isolation, artifacts preserved | **proved** |

## What it did **not** prove

**That it is hard.** All 4 counted agent trials passed every graded scenario. The
submissions were genuine implementations, not refusals or stubs — which makes this a
measurement rather than a harness failure, and the measurement is that the task is easy for
the models it was built to separate.

A clean smoke pass is useful evidence ONLY when the package withheld the answer. Given that, it prevents wasting a `/6` matrix and routes the family into evolution.

It also did not prove the opposite: 4 counted clean passes by the available model family is a signal, not a proof about every provider. What it forecloses is *shipping on the current evidence*.

### The trials

| run | evidence state | model | runtime | scenarios | failed | isolation |
|---|---|---|---:|---:|---:|---|
| `phase17-caa-slot-1-openai-attempt-1` | canonical counted | openai/gpt-5.6-sol | 48s | 24 | 0 | container |
| `phase17-caa-slot-2-anthropic-attempt-1` | canonical counted | claude opus | 88s | 24 | 0 | container |
| `phase17-caa-slot-3-openai-attempt-1` | canonical counted | openai/gpt-5.6-sol | 80s | 24 | 0 | container |
| `phase17-caa-slot-4-anthropic-attempt-1` | canonical counted | claude opus | 100s | 24 | 0 | container |

## Why it is not ready

Blocking gates failing: `difficulty-evidenced`, `not-already-solved`.

Advisory gates failing: `shared-bank-ready`.

## Findings

### `already_solved` — weakness, derived

Every counted agent trial passed cleanly. Whatever the verifier can detect, no subject in this bank exhibits it.

**Disposition:** `harden`. **Evidence required:** at least one counted agent trial, and every one of them passing.

| evidence |
|---|
| 4 counted agent trial(s), 4 of them passing every graded scenario |
| isolation: container |

Supporting gates: `not-already-solved`.

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
| **Task weakness** — the family is too easy | **yes, primary** | counted trials all passing |
| **Model strength** — the models are simply good at this | contributory | the submissions were real implementations citing the rules, not lucky guesses. That is a fact about the models AND about the task: the task did not distinguish them. |
| **Policy explicitness** — the spec gave away the answer | likely contributory | the published rule order made attribution a lookup rather than a derivation. `reduce_policy_explicitness` is the operator that tests this directly. |
| **Synthetic data** — the fixtures are too clean to transfer | unmeasured | scenarios are single-turn and fully observable; nothing has tested whether a pass transfers to a longer, noisier setting |
| **Lack of trial evidence** — nothing has attempted it | no — trials exist | 4 counted trials |

## What would make it stronger

The evolution engine proposes the following, each a composition of named operators rather than
a fresh idea. Kill risk is the pre-registered probability that the variant dies of the same
cause as its parent.

| variant | operators | new mechanisms | axes | kill risk | build h |
|---|---|---|---:|---:|---:|
| `caa-revalidation-capability-routing` | `add_cross_tool_interaction`, `add_partial_observability`, `add_benign_noise` | `permission-boundary`, `tool-result-ambiguity`, `prompt-injection-via-retrieval` | 3 | 50% | 60 |
| `caa-revalidation-memory-poisoning` | `add_time_separation`, `add_stateful_memory`, `add_benign_noise` | `context-contamination`, `false-audit-history`, `prompt-injection-via-retrieval` | 4 | 30% | 75 |
| `caa-revalidation-cross-tool-escalation` | `add_cross_tool_interaction`, `lengthen_horizon` | `permission-boundary`, `tool-result-ambiguity`, `duplicate-side-effects` | 3 | 45% | 55 |
| `caa-revalidation-approval-scope-drift` | `add_time_separation`, `reduce_policy_explicitness` | `permission-boundary`, `context-contamination` | 3 | 40% | 50 |

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
