# The ship gate

19 gates, 13 of them blocking. A family ships when every blocking gate
passes; there is no score, no weighting and no override. This document is generated from the gate
definitions themselves, so a gate that exists in the code cannot be missing here.

## Blocking

A blocking gate is one whose absence means the family cannot produce trustworthy evidence at all.

| gate | question | pass | fail | n/a |
|---|---|---:|---:|---:|
| `solvable` | Is there a reference contract proving the family is solvable? | 9 | 0 | 0 |
| `verifier-graded` | Does it name at least 2 known-bad implementations its verifier must catch? | 9 | 0 | 0 |
| `trust-boundary` | Does every authoritative source state why the implementation cannot forge it? | 9 | 0 | 0 |
| `detectable` | Does every mechanism it targets have a mutant in the bank? | 9 | 0 | 0 |
| `fairness` | Are fairness constraints stated? | 9 | 0 | 0 |
| `cheat-resistance` | Are cheat-resistance requirements stated? | 9 | 0 | 0 |
| `is-a-family` | Does it have at least 3 knobs, so instances are cheaper than authoring? | 9 | 0 | 0 |
| `hidden-region-declared` | Is the hidden graded region stated as a sampling of the declared space? | 9 | 0 | 0 |
| `reference-passes` | Does the reference pass every graded scenario, when actually run? | 1 | 0 | 8 |
| `baselines-blocked` | Do the trivial baselines — do nothing, refuse everything — fail? | 1 | 0 | 8 |
| `mutants-caught-by-intended-check` | Is every declared mutant caught by the check it was written to trip? | 1 | 0 | 8 |
| `mechanisms-exercised` | Does every hidden scenario actually exercise the mechanism it claims to? | 1 | 0 | 8 |
| `not-already-solved` | Is there at least one counted agent trial that did NOT pass cleanly? | 1 | 1 | 7 |

## Advisory

An advisory gate is one where a reasonable author might disagree. Reported, never blocking.

| gate | question | pass | fail | n/a |
|---|---|---:|---:|---:|
| `measured-axes` | Has it measured at least 2 independent axes? | 2 | 0 | 7 |
| `isolation-level` | Is the isolation strong enough for the subjects being graded? | 1 | 0 | 8 |
| `shared-bank-ready` | Have enough subjects attempted this family AND another, so cross-family axes are measurable? | 0 | 1 | 8 |
| `deterministic-reports` | Do this family's reports regenerate byte-identically? | 1 | 0 | 8 |
| `difficulty-evidenced` | Has any real agent or model been measured against this family? | 2 | 7 | 0 |
| `priced` | Is the build cost recorded? | 9 | 0 | 0 |

## Which gates have actually stopped something

A gate that has never failed is not yet evidence of discipline — it may be a gate that cannot
fail. These are the ones that currently reject at least one family:

| gate | blocking | families it rejects | why the gate exists |
|---|---|---|---|
| `shared-bank-ready` | no | `prompt-injection-containment` | Axis counts across disjoint banks add by construction and mean nothing. Only shared subjects make 'did the same implementation fail both?' a question with an answer. |
| `difficulty-evidenced` | no | `audit-truth-financial-workflow`, `browser-action-replay`, `deployment-rollback-partial-effects`, `model-alias-drift-sentinel`, `permission-boundary-tools`, `stale-crm-ticket-automation`, `ui-action-record-replay` | A measured axis count against a bank of hand-written mutants proves the VERIFIER discriminates. It says nothing about whether the family is hard, because nothing that could plausibly fail it has attempted it. This gate was added after the second family scored four measured axes with zero agent trials and would otherwise have been marked SHIP. |
| `not-already-solved` | yes | `prompt-injection-containment` | A family every model solves measures nothing, and `already-solved` was the single most common cause of death in the source project's kill log — four of nine gated mechanisms. This gate was added after three real Claude trials on the containment family each passed 128 of 128: the difficulty gate had just started passing, and without this one the family would have shipped on evidence that it is easy. |

**9 gate(s) pass for every family and have never rejected anything here:**
`solvable`, `verifier-graded`, `trust-boundary`, `detectable`, `fairness`, `cheat-resistance`, `is-a-family`, `hidden-region-declared`, `priced`.

That is not automatically a criticism — a gate on the reference contract should pass for every
family that got as far as being written down. It is recorded so the table is not read as
though every row were doing equal work.

## Every gate, in full

### `solvable` — **blocking**

**Is there a reference contract proving the family is solvable?**

A family whose reference does not pass is measuring its own bugs. No trial budget should be spent before the reference is green.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | pass | 7 contract item(s) |
| `browser-action-replay` | pass | 7 contract item(s) |
| `deployment-rollback-partial-effects` | pass | 7 contract item(s) |
| `durable-approval-outbox` | pass | 8 contract item(s) |
| `model-alias-drift-sentinel` | pass | 6 contract item(s) |
| `permission-boundary-tools` | pass | 7 contract item(s) |
| `prompt-injection-containment` | pass | 7 contract item(s) |
| `stale-crm-ticket-automation` | pass | 6 contract item(s) |
| `ui-action-record-replay` | pass | 7 contract item(s) |

### `verifier-graded` — **blocking**

**Does it name at least 2 known-bad implementations its verifier must catch?**

Two of three Opus engines in the source trials wrote checkers that could not express the rule they were checking, so their own fuzzers ran clean over the bug. Mutants are how a verifier gets graded instead of trusted.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | pass | 4 expected mutant(s) |
| `browser-action-replay` | pass | 5 expected mutant(s) |
| `deployment-rollback-partial-effects` | pass | 4 expected mutant(s) |
| `durable-approval-outbox` | pass | 5 expected mutant(s) |
| `model-alias-drift-sentinel` | pass | 4 expected mutant(s) |
| `permission-boundary-tools` | pass | 4 expected mutant(s) |
| `prompt-injection-containment` | pass | 5 expected mutant(s) |
| `stale-crm-ticket-automation` | pass | 4 expected mutant(s) |
| `ui-action-record-replay` | pass | 5 expected mutant(s) |

### `trust-boundary` — **blocking**

**Does every authoritative source state why the implementation cannot forge it?**

All three verifier bypasses found in the source project were the same shape: a ground truth the engine turned out to be able to reach or rewrite.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | pass | 3/3 source(s) state unforgeability |
| `browser-action-replay` | pass | 3/3 source(s) state unforgeability |
| `deployment-rollback-partial-effects` | pass | 3/3 source(s) state unforgeability |
| `durable-approval-outbox` | pass | 4/4 source(s) state unforgeability |
| `model-alias-drift-sentinel` | pass | 3/3 source(s) state unforgeability |
| `permission-boundary-tools` | pass | 3/3 source(s) state unforgeability |
| `prompt-injection-containment` | pass | 3/3 source(s) state unforgeability |
| `stale-crm-ticket-automation` | pass | 3/3 source(s) state unforgeability |
| `ui-action-record-replay` | pass | 2/2 source(s) state unforgeability |

### `detectable` — **blocking**

**Does every mechanism it targets have a mutant in the bank?**

A mechanism with no known-bad implementation is a difficulty the foundry can describe but not detect, so a family built on it cannot demonstrate it measures anything.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | pass | all mechanisms detectable |
| `browser-action-replay` | pass | all mechanisms detectable |
| `deployment-rollback-partial-effects` | pass | all mechanisms detectable |
| `durable-approval-outbox` | pass | all mechanisms detectable |
| `model-alias-drift-sentinel` | pass | all mechanisms detectable |
| `permission-boundary-tools` | pass | all mechanisms detectable |
| `prompt-injection-containment` | pass | all mechanisms detectable |
| `stale-crm-ticket-automation` | pass | all mechanisms detectable |
| `ui-action-record-replay` | pass | all mechanisms detectable |

### `fairness` — **blocking**

**Are fairness constraints stated?**

Four of nine gated mechanisms in the source project died as already-solved or unfair. Both are cheaper to find on paper than after a build.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | pass | 5 constraint(s) |
| `browser-action-replay` | pass | 5 constraint(s) |
| `deployment-rollback-partial-effects` | pass | 5 constraint(s) |
| `durable-approval-outbox` | pass | 5 constraint(s) |
| `model-alias-drift-sentinel` | pass | 5 constraint(s) |
| `permission-boundary-tools` | pass | 5 constraint(s) |
| `prompt-injection-containment` | pass | 5 constraint(s) |
| `stale-crm-ticket-automation` | pass | 5 constraint(s) |
| `ui-action-record-replay` | pass | 5 constraint(s) |

### `cheat-resistance` — **blocking**

**Are cheat-resistance requirements stated?**

An ungamed grader is an assumption until it is a requirement. Two of the three real bypasses were found by writing the exploit, not by inspection.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | pass | 5 requirement(s) |
| `browser-action-replay` | pass | 5 requirement(s) |
| `deployment-rollback-partial-effects` | pass | 5 requirement(s) |
| `durable-approval-outbox` | pass | 5 requirement(s) |
| `model-alias-drift-sentinel` | pass | 5 requirement(s) |
| `permission-boundary-tools` | pass | 5 requirement(s) |
| `prompt-injection-containment` | pass | 5 requirement(s) |
| `stale-crm-ticket-automation` | pass | 5 requirement(s) |
| `ui-action-record-replay` | pass | 5 requirement(s) |

### `is-a-family` — **blocking**

**Does it have at least 3 knobs, so instances are cheaper than authoring?**

A family with no parameter space is a single task wearing a family's name, and the entire economic argument depends on instances being nearly free once the family exists.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | pass | 6 knob(s): correctionLag, retroAuthorityTiming, delegationDepth, reversalChainLength, asOfQueryDensity, seed |
| `browser-action-replay` | pass | 7 knob(s): seed, mutation_class, mutation_depth, viewport, locale, feature_flags, state_delta |
| `deployment-rollback-partial-effects` | pass | 6 knob(s): regionTopology, reversibilityMix, faultPoint, abortArrivalStep, ledgerSettleDelay, seed |
| `durable-approval-outbox` | pass | 7 knob(s): seed, n_workers, crash_point, withdrawal_after_invoke, receipt_after_invokes, key_index, unknown_landed |
| `model-alias-drift-sentinel` | pass | 5 knob(s): drift_schedule, missing_resolved_id_rate, undeclared_dep, alias_count, seed |
| `permission-boundary-tools` | pass | 5 knob(s): chain_depth, amplifying_hop, permitted_path_share, confused_deputy_present, seed |
| `prompt-injection-containment` | pass | 7 knob(s): seed, carrier_surface, derivation_hops, injection_aligns_with_task, confirmation_budget, corpus_size, capability_scope |
| `stale-crm-ticket-automation` | pass | 6 knob(s): mutation_point, duplicate_delivery_multiplicity, ack_true_outcome, crash_point, terminal_state_present, seed |
| `ui-action-record-replay` | pass | 6 knob(s): seed, mutation, mutation_depth, confirmation, async_settled, replay_count |

### `hidden-region-declared` — **blocking**

**Is the hidden graded region stated as a sampling of the declared space?**

Hidden tests that add rules are unfair; hidden tests that sample a declared space are not. The difference has to be written down or nobody can tell which one was built.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | pass | Hidden instances are sampled from the same declared grammar as the shipped fixtu |
| `browser-action-replay` | pass | The hidden suite samples the declared mutation grammar rather than extending it: |
| `deployment-rollback-partial-effects` | pass | Hidden instances are sampled from the same declared grammar as the shipped ones  |
| `durable-approval-outbox` | pass | The hidden suite samples 24 points out of the declared space of schedules x seed |
| `model-alias-drift-sentinel` | pass | Hidden instances sample the declared drift-event space — which of the five docum |
| `permission-boundary-tools` | pass | Hidden instances sample the declared chain grammar — chain depth one through fou |
| `prompt-injection-containment` | pass | The hidden suite samples the declared injection space rather than adding rules t |
| `stale-crm-ticket-automation` | pass | Hidden instances sample the declared mutation-point space: which of the four doc |
| `ui-action-record-replay` | pass | The hidden suite samples the declared UI-mutation space: which selector attribut |

### `measured-axes` — advisory

**Has it measured at least 2 independent axes?**

The point of the whole exercise. A family yielding one axis is one measurement however many instances it generates. Advisory rather than blocking, because an unbuilt family cannot have measured anything yet — but it must not ship on an estimate.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | n/a | estimated — axes; not measured |
| `browser-action-replay` | n/a | estimated — axes; not measured |
| `deployment-rollback-partial-effects` | n/a | estimated — axes; not measured |
| `durable-approval-outbox` | pass | 3 measured axes |
| `model-alias-drift-sentinel` | n/a | estimated 2 axes; not measured |
| `permission-boundary-tools` | n/a | estimated 1 axes; not measured |
| `prompt-injection-containment` | pass | 4 measured axes |
| `stale-crm-ticket-automation` | n/a | estimated 2 axes; not measured |
| `ui-action-record-replay` | n/a | estimated 3 axes; not measured |

### `reference-passes` — **blocking**

**Does the reference pass every graded scenario, when actually run?**

Declared solvability is not solvability. A family whose reference fails is measuring its own bugs, and every number it produces afterwards is noise.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | n/a | family not built; nothing to run |
| `browser-action-replay` | n/a | family not built; nothing to run |
| `deployment-rollback-partial-effects` | n/a | family not built; nothing to run |
| `durable-approval-outbox` | n/a | family not built; nothing to run |
| `model-alias-drift-sentinel` | n/a | family not built; nothing to run |
| `permission-boundary-tools` | n/a | family not built; nothing to run |
| `prompt-injection-containment` | pass | reference clean |
| `stale-crm-ticket-automation` | n/a | family not built; nothing to run |
| `ui-action-record-replay` | n/a | family not built; nothing to run |

### `baselines-blocked` — **blocking**

**Do the trivial baselines — do nothing, refuse everything — fail?**

The classic way a safety suite measures nothing: the implementation that refuses everything tops the leaderboard. If a no-op or an over-blocker can pass, the suite is not measuring containment, it is measuring caution.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | n/a | family not built |
| `browser-action-replay` | n/a | family not built |
| `deployment-rollback-partial-effects` | n/a | family not built |
| `durable-approval-outbox` | n/a | family not built |
| `model-alias-drift-sentinel` | n/a | family not built |
| `permission-boundary-tools` | n/a | family not built |
| `prompt-injection-containment` | pass | 2/2 baselines rejected |
| `stale-crm-ticket-automation` | n/a | family not built |
| `ui-action-record-replay` | n/a | family not built |

### `mutants-caught-by-intended-check` — **blocking**

**Is every declared mutant caught by the check it was written to trip?**

Catching a mutant by accident, via some unrelated assertion, is luck rather than coverage — and it breaks silently the moment the unrelated assertion changes. The bank grades the verifier only if each catch is attributable.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | n/a | family not built |
| `browser-action-replay` | n/a | family not built |
| `deployment-rollback-partial-effects` | n/a | family not built |
| `durable-approval-outbox` | n/a | family not built |
| `model-alias-drift-sentinel` | n/a | family not built |
| `permission-boundary-tools` | n/a | family not built |
| `prompt-injection-containment` | pass | 9/9 caught by intended check |
| `stale-crm-ticket-automation` | n/a | family not built |
| `ui-action-record-replay` | n/a | family not built |

### `mechanisms-exercised` — **blocking**

**Does every hidden scenario actually exercise the mechanism it claims to?**

A scenario can be blocked by an earlier rule than the one it was built for, look correct, and test nothing. This family shipped that defect: two mutants scored 0/144 because their scenarios never reached P5 and P6.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | n/a | family not built |
| `browser-action-replay` | n/a | family not built |
| `deployment-rollback-partial-effects` | n/a | family not built |
| `durable-approval-outbox` | n/a | family not built |
| `model-alias-drift-sentinel` | n/a | family not built |
| `permission-boundary-tools` | n/a | family not built |
| `prompt-injection-containment` | pass | every attack blocks on its governing rule |
| `stale-crm-ticket-automation` | n/a | family not built |
| `ui-action-record-replay` | n/a | family not built |

### `isolation-level` — advisory

**Is the isolation strong enough for the subjects being graded?**

In-process isolation is sufficient for code this repository wrote and insufficient for code an agent wrote. Grading an agent artifact in the same memory as the grader is how all three of the source project's verifier bypasses would have worked.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | n/a | family not built |
| `browser-action-replay` | n/a | family not built |
| `deployment-rollback-partial-effects` | n/a | family not built |
| `durable-approval-outbox` | n/a | family not built |
| `model-alias-drift-sentinel` | n/a | family not built |
| `permission-boundary-tools` | n/a | family not built |
| `prompt-injection-containment` | pass | subprocess with 3 agent trial(s) |
| `stale-crm-ticket-automation` | n/a | family not built |
| `ui-action-record-replay` | n/a | family not built |

### `shared-bank-ready` — advisory

**Have enough subjects attempted this family AND another, so cross-family axes are measurable?**

Axis counts across disjoint banks add by construction and mean nothing. Only shared subjects make 'did the same implementation fail both?' a question with an answer.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | n/a | family not built |
| `browser-action-replay` | n/a | family not built |
| `deployment-rollback-partial-effects` | n/a | family not built |
| `durable-approval-outbox` | n/a | family not built |
| `model-alias-drift-sentinel` | n/a | family not built |
| `permission-boundary-tools` | n/a | family not built |
| `prompt-injection-containment` | fail | 1 subject(s) shared with another family (need 3) |
| `stale-crm-ticket-automation` | n/a | family not built |
| `ui-action-record-replay` | n/a | family not built |

### `deterministic-reports` — advisory

**Do this family's reports regenerate byte-identically?**

A report nobody can reproduce is a report nobody can audit.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | n/a | family not built |
| `browser-action-replay` | n/a | family not built |
| `deployment-rollback-partial-effects` | n/a | family not built |
| `durable-approval-outbox` | n/a | family not built |
| `model-alias-drift-sentinel` | n/a | family not built |
| `permission-boundary-tools` | n/a | family not built |
| `prompt-injection-containment` | pass | verified |
| `stale-crm-ticket-automation` | n/a | family not built |
| `ui-action-record-replay` | n/a | family not built |

### `difficulty-evidenced` — advisory

**Has any real agent or model been measured against this family?**

A measured axis count against a bank of hand-written mutants proves the VERIFIER discriminates. It says nothing about whether the family is hard, because nothing that could plausibly fail it has attempted it. This gate was added after the second family scored four measured axes with zero agent trials and would otherwise have been marked SHIP.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | fail | no counted agent trials |
| `browser-action-replay` | fail | no counted agent trials |
| `deployment-rollback-partial-effects` | fail | no counted agent trials |
| `durable-approval-outbox` | pass | 6 counted agent trial(s) |
| `model-alias-drift-sentinel` | fail | no counted agent trials |
| `permission-boundary-tools` | fail | no counted agent trials |
| `prompt-injection-containment` | pass | 3 counted agent trial(s) |
| `stale-crm-ticket-automation` | fail | no counted agent trials |
| `ui-action-record-replay` | fail | no counted agent trials |

### `not-already-solved` — **blocking**

**Is there at least one counted agent trial that did NOT pass cleanly?**

A family every model solves measures nothing, and `already-solved` was the single most common cause of death in the source project's kill log — four of nine gated mechanisms. This gate was added after three real Claude trials on the containment family each passed 128 of 128: the difficulty gate had just started passing, and without this one the family would have shipped on evidence that it is easy.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | n/a | no counted agent trials yet |
| `browser-action-replay` | n/a | no counted agent trials yet |
| `deployment-rollback-partial-effects` | n/a | no counted agent trials yet |
| `durable-approval-outbox` | pass | 6 of 6 declared trial(s) failed — declared by the shape, not measured here |
| `model-alias-drift-sentinel` | n/a | no counted agent trials yet |
| `permission-boundary-tools` | n/a | no counted agent trials yet |
| `prompt-injection-containment` | fail | all 3 counted trial(s) passed every scenario — the family is already-solved |
| `stale-crm-ticket-automation` | n/a | no counted agent trials yet |
| `ui-action-record-replay` | n/a | no counted agent trials yet |

### `priced` — advisory

**Is the build cost recorded?**

An unpriced family cannot enter the budget model, so the plan built on it is fiction.

| family | verdict | detail |
|---|---|---|
| `audit-truth-financial-workflow` | pass | 45h build, $60 frontier |
| `browser-action-replay` | pass | 90h build, $80 frontier |
| `deployment-rollback-partial-effects` | pass | 60h build, $75 frontier |
| `durable-approval-outbox` | pass | 120h build, $48.66 frontier |
| `model-alias-drift-sentinel` | pass | 55h build, $50 frontier |
| `permission-boundary-tools` | pass | 45h build, $50 frontier |
| `prompt-injection-containment` | pass | 70h build, $65 frontier |
| `stale-crm-ticket-automation` | pass | 70h build, $55 frontier |
| `ui-action-record-replay` | pass | 55h build, $40 frontier |

## Verdicts

| family | verdict | blocking failures |
|---|---|---|
| `audit-truth-financial-workflow` | **HOLD** | none |
| `browser-action-replay` | **HOLD** | none |
| `deployment-rollback-partial-effects` | **HOLD** | none |
| `durable-approval-outbox` | **SHIP** | none |
| `model-alias-drift-sentinel` | **HOLD** | none |
| `permission-boundary-tools` | **HOLD** | none |
| `prompt-injection-containment` | **NOT-READY** | `not-already-solved` |
| `stale-crm-ticket-automation` | **HOLD** | none |
| `ui-action-record-replay` | **HOLD** | none |

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
