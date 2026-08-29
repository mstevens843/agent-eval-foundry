# Ship / no-ship

Each family against a fixed gate table. The verdict is a pure function of the gates — no
weighting, no score, no override. **SHIP** means every blocking gate passes and the family has a
measured axis count of at least 2; **HOLD** means it is structurally sound but its diversity is still an
estimate; **NOT-READY** means at least one blocking gate fails.

| family | verdict | blocking failures |
|---|---|---|
| `audit-truth-financial-workflow` | **HOLD** | none |
| `browser-action-replay` | **HOLD** | none |
| `deployment-rollback-partial-effects` | **HOLD** | none |
| `durable-approval-outbox` | **SHIP** | none |
| `model-alias-drift-sentinel` | **HOLD** | none |
| `permission-boundary-tools` | **HOLD** | none |
| `prompt-injection-containment` | **HOLD** | none |
| `stale-crm-ticket-automation` | **HOLD** | none |

## Gate table

| gate | blocking | question |
|---|---|---|
| `solvable` | yes | Is there a reference contract proving the family is solvable? |
| `verifier-graded` | yes | Does it name at least 2 known-bad implementations its verifier must catch? |
| `trust-boundary` | yes | Does every authoritative source state why the implementation cannot forge it? |
| `detectable` | yes | Does every mechanism it targets have a mutant in the bank? |
| `fairness` | yes | Are fairness constraints stated? |
| `cheat-resistance` | yes | Are cheat-resistance requirements stated? |
| `is-a-family` | yes | Does it have at least 3 knobs, so instances are cheaper than authoring? |
| `hidden-region-declared` | yes | Is the hidden graded region stated as a sampling of the declared space? |
| `measured-axes` | advisory | Has it measured at least 2 independent axes? |
| `priced` | advisory | Is the build cost recorded? |

## Per family

### `audit-truth-financial-workflow` — HOLD

| gate | result | detail |
|---|---|---|
| `solvable` | pass | 7 contract item(s) |
| `verifier-graded` | pass | 4 expected mutant(s) |
| `trust-boundary` | pass | 3/3 source(s) state unforgeability |
| `detectable` | pass | all mechanisms detectable |
| `fairness` | pass | 5 constraint(s) |
| `cheat-resistance` | pass | 5 requirement(s) |
| `is-a-family` | pass | 6 knob(s): correctionLag, retroAuthorityTiming, delegationDepth, reversalChainLength, asOfQueryDensity, seed |
| `hidden-region-declared` | pass | Hidden instances are sampled from the same declared grammar as the shipped fixtu |
| `measured-axes` | n/a | estimated — axes; not measured |
| `priced` | pass | 45h build, $60 frontier |

### `browser-action-replay` — HOLD

| gate | result | detail |
|---|---|---|
| `solvable` | pass | 7 contract item(s) |
| `verifier-graded` | pass | 5 expected mutant(s) |
| `trust-boundary` | pass | 3/3 source(s) state unforgeability |
| `detectable` | pass | all mechanisms detectable |
| `fairness` | pass | 5 constraint(s) |
| `cheat-resistance` | pass | 5 requirement(s) |
| `is-a-family` | pass | 7 knob(s): seed, mutation_class, mutation_depth, viewport, locale, feature_flags, state_delta |
| `hidden-region-declared` | pass | The hidden suite samples the declared mutation grammar rather than extending it: |
| `measured-axes` | n/a | estimated — axes; not measured |
| `priced` | pass | 90h build, $80 frontier |

### `deployment-rollback-partial-effects` — HOLD

| gate | result | detail |
|---|---|---|
| `solvable` | pass | 7 contract item(s) |
| `verifier-graded` | pass | 4 expected mutant(s) |
| `trust-boundary` | pass | 3/3 source(s) state unforgeability |
| `detectable` | pass | all mechanisms detectable |
| `fairness` | pass | 5 constraint(s) |
| `cheat-resistance` | pass | 5 requirement(s) |
| `is-a-family` | pass | 6 knob(s): regionTopology, reversibilityMix, faultPoint, abortArrivalStep, ledgerSettleDelay, seed |
| `hidden-region-declared` | pass | Hidden instances are sampled from the same declared grammar as the shipped ones  |
| `measured-axes` | n/a | estimated — axes; not measured |
| `priced` | pass | 60h build, $75 frontier |

### `durable-approval-outbox` — SHIP

| gate | result | detail |
|---|---|---|
| `solvable` | pass | 8 contract item(s) |
| `verifier-graded` | pass | 5 expected mutant(s) |
| `trust-boundary` | pass | 4/4 source(s) state unforgeability |
| `detectable` | pass | all mechanisms detectable |
| `fairness` | pass | 5 constraint(s) |
| `cheat-resistance` | pass | 5 requirement(s) |
| `is-a-family` | pass | 7 knob(s): seed, n_workers, crash_point, withdrawal_after_invoke, receipt_after_invokes, key_index, unknown_landed |
| `hidden-region-declared` | pass | The hidden suite samples 24 points out of the declared space of schedules x seed |
| `measured-axes` | pass | 3 measured axes |
| `priced` | pass | 120h build, $48.66 frontier |

### `model-alias-drift-sentinel` — HOLD

| gate | result | detail |
|---|---|---|
| `solvable` | pass | 6 contract item(s) |
| `verifier-graded` | pass | 4 expected mutant(s) |
| `trust-boundary` | pass | 3/3 source(s) state unforgeability |
| `detectable` | pass | all mechanisms detectable |
| `fairness` | pass | 5 constraint(s) |
| `cheat-resistance` | pass | 5 requirement(s) |
| `is-a-family` | pass | 5 knob(s): drift_schedule, missing_resolved_id_rate, undeclared_dep, alias_count, seed |
| `hidden-region-declared` | pass | Hidden instances sample the declared drift-event space — which of the five docum |
| `measured-axes` | n/a | estimated 2 axes; not measured |
| `priced` | pass | 55h build, $50 frontier |

### `permission-boundary-tools` — HOLD

| gate | result | detail |
|---|---|---|
| `solvable` | pass | 7 contract item(s) |
| `verifier-graded` | pass | 4 expected mutant(s) |
| `trust-boundary` | pass | 3/3 source(s) state unforgeability |
| `detectable` | pass | all mechanisms detectable |
| `fairness` | pass | 5 constraint(s) |
| `cheat-resistance` | pass | 5 requirement(s) |
| `is-a-family` | pass | 5 knob(s): chain_depth, amplifying_hop, permitted_path_share, confused_deputy_present, seed |
| `hidden-region-declared` | pass | Hidden instances sample the declared chain grammar — chain depth one through fou |
| `measured-axes` | n/a | estimated 1 axes; not measured |
| `priced` | pass | 45h build, $50 frontier |

### `prompt-injection-containment` — HOLD

| gate | result | detail |
|---|---|---|
| `solvable` | pass | 7 contract item(s) |
| `verifier-graded` | pass | 5 expected mutant(s) |
| `trust-boundary` | pass | 3/3 source(s) state unforgeability |
| `detectable` | pass | all mechanisms detectable |
| `fairness` | pass | 5 constraint(s) |
| `cheat-resistance` | pass | 5 requirement(s) |
| `is-a-family` | pass | 7 knob(s): seed, carrier_surface, derivation_hops, injection_aligns_with_task, confirmation_budget, corpus_size, capability_scope |
| `hidden-region-declared` | pass | The hidden suite samples the declared injection space rather than adding rules t |
| `measured-axes` | n/a | estimated — axes; not measured |
| `priced` | pass | 70h build, $65 frontier |

### `stale-crm-ticket-automation` — HOLD

| gate | result | detail |
|---|---|---|
| `solvable` | pass | 6 contract item(s) |
| `verifier-graded` | pass | 4 expected mutant(s) |
| `trust-boundary` | pass | 3/3 source(s) state unforgeability |
| `detectable` | pass | all mechanisms detectable |
| `fairness` | pass | 5 constraint(s) |
| `cheat-resistance` | pass | 5 requirement(s) |
| `is-a-family` | pass | 6 knob(s): mutation_point, duplicate_delivery_multiplicity, ack_true_outcome, crash_point, terminal_state_present, seed |
| `hidden-region-declared` | pass | Hidden instances sample the declared mutation-point space: which of the four doc |
| `measured-axes` | n/a | estimated 2 axes; not measured |
| `priced` | pass | 70h build, $55 frontier |

## Why these gates

- **`solvable`** — A family whose reference does not pass is measuring its own bugs. No trial budget should be spent before the reference is green.
- **`verifier-graded`** — Two of three Opus engines in the source trials wrote checkers that could not express the rule they were checking, so their own fuzzers ran clean over the bug. Mutants are how a verifier gets graded instead of trusted.
- **`trust-boundary`** — All three verifier bypasses found in the source project were the same shape: a ground truth the engine turned out to be able to reach or rewrite.
- **`detectable`** — A mechanism with no known-bad implementation is a difficulty the foundry can describe but not detect, so a family built on it cannot demonstrate it measures anything.
- **`fairness`** — Four of nine gated mechanisms in the source project died as already-solved or unfair. Both are cheaper to find on paper than after a build.
- **`cheat-resistance`** — An ungamed grader is an assumption until it is a requirement. Two of the three real bypasses were found by writing the exploit, not by inspection.
- **`is-a-family`** — A family with no parameter space is a single task wearing a family's name, and the entire economic argument depends on instances being nearly free once the family exists.
- **`hidden-region-declared`** — Hidden tests that add rules are unfair; hidden tests that sample a declared space are not. The difference has to be written down or nobody can tell which one was built.
- **`measured-axes`** — The point of the whole exercise. A family yielding one axis is one measurement however many instances it generates. Advisory rather than blocking, because an unbuilt family cannot have measured anything yet — but it must not ship on an estimate.
- **`priced`** — An unpriced family cannot enter the budget model, so the plan built on it is fiction.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
