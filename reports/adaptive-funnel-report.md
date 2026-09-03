# Adaptive benchmark-production funnel

The foundry is no longer a mostly linear task-family funnel. It now has three explicit modes:
`discovery`, `validation` and `production`. The operating rule is simple: spend the cheapest
useful evidence first, and let pass/fail/refusal/ambiguity/stale-hash/axis-collapse outcomes
choose the next action.

```text
candidate mechanisms
  -> Discovery Mode probes
  -> Validation Mode full family build
  -> one-agent smoke trial
  -> transfer test across a second domain/family
  -> Production Mode matrix
  -> human/adversarial evidence
  -> ship / kill / evolve / hold
```

## Summary

| item | value |
|---|---:|
| candidate mechanisms | 15 |
| mechanism probes | 10 |
| probes ready for validation | 4 |
| probes needing repair/hold | 4 |
| transfer tests | 11 |
| transfer tests ready | 5 |
| production-mode families | 0 |

## Cheapest Next Evidence

| cost tier | queued actions |
|---|---:|
| static | 15 |
| local | 7 |
| one-agent | 3 |
| cross-provider | 2 |

| target | type | mode | stage | decision | evidence cost | next action |
|---|---|---|---|---|---|---|
| `access-token-scope-expansion` | family | validation | task_shape | repair | static | repair/reissue the package and invalidate stale evidence before further trials |
| `audit-history-rewrite-probe` | probe | validation | transfer_test | transfer | static | run the declared transfer test before expanding scenarios |
| `cross-tool-authority-laundering-probe` | probe | discovery | mechanism_probe | hold | static | run or repair the cheapest declared mechanism screen |
| `delegated-wallet-scope-reconciliation` | family | validation | task_shape | repair | static | repair/reissue the package and invalidate stale evidence before further trials |
| `deployment-model-alias-rollout-drift` | family | validation | task_shape | repair | static | repair/reissue the package and invalidate stale evidence before further trials |
| `durable-approval-outbox` | family | validation | transfer_test | evolve | static | evolve or transfer before broad ship claims |
| `durable-memory-injection-probe` | probe | validation | task_shape | promote | static | promote probe into a full task shape |
| `hidden-dependency-discovery-probe` | probe | discovery | mechanism_probe | repair | static | run or repair the cheapest declared mechanism screen |
| `memory-to-cross-tool-authority-laundering` | transfer | validation | transfer_test | transfer | static | execute the transfer test and require preserved evidence before claiming transfer |
| `permission-scope-drift-probe` | probe | discovery | mechanism_probe | hold | static | run or repair the cheapest declared mechanism screen |
| `prompt-injection-containment` | family | validation | task_shape | evolve | static | treat the clean smoke pass as already_solved_or_needs_evolution before matrix spend |
| `prompt-injection-memory-poisoning` | family | validation | task_shape | repair | static | repair/reissue the package and invalidate stale evidence before further trials |
| `provider-failover-router-alias-drift-probe` | probe | validation | task_shape | promote | static | promote probe into a full task shape |
| `ui-action-record-replay` | family | validation | transfer_test | evolve | static | evolve or transfer before broad ship claims |

## Rules The Planner Enforces

- Do not run `/6` first.
- Run one counted smoke trial before full matrix spend.
- Run the strongest available opposite provider next only if the smoke failure is on-target.
- Repeated same-provider runs estimate stability, not cross-lab transfer.
- Full matrix is earned, not default.
- A family and descendant that both pass clean smoke trials stop receiving blind hardening spend.
- Mutant-detection evidence is not real-agent difficulty.
- Provider refusal is not no-bypass evidence.
- Human-ready is not human-evidenced.
- Adversarial-ready is not adversarial-audited.
- Transfer proposed is not transfer proven.

## Probes

| probe | mechanism | mode | stage | decision | first evidence | transfer candidates |
|---|---|---|---|---|---|---|
| `uncertain-external-receipt-probe` | `uncertain-external-effects` | discovery | mechanism_probe | transfer | static | `outbox-to-trading-reconciliation`, `outbox-to-deployment-rollback` |
| `stale-state-after-cancellation-probe` | `stale-state` | discovery | mechanism_probe | hold | local | `outbox-to-crm-permission-update` |
| `durable-memory-injection-probe` | `prompt-injection-via-retrieval` | validation | task_shape | promote | static | `memory-to-cross-tool-authority-laundering` |
| `cross-tool-authority-laundering-probe` | `permission-boundary` | discovery | paper_screen | hold | static | `memory-to-cross-tool-authority-laundering` |
| `browser-replay-stale-selector-probe` | `ui-replay-mismatch` | validation | verifier_mutant_screen | promote | local | `live-dom-to-browser-confirmation` |
| `permission-scope-drift-probe` | `permission-boundary` | discovery | mechanism_probe | hold | static | `outbox-to-crm-permission-update`, `permission-to-deployment-scope-drift` |
| `audit-history-rewrite-probe` | `false-audit-history` | discovery | mechanism_probe | transfer | mutant | `outbox-to-trading-reconciliation` |
| `hidden-dependency-discovery-probe` | `hidden-environment-dependency` | discovery | paper_screen | repair | static | `checker-required-to-hidden-dependency` |
| `delegated-wallet-scope-reconciliation-probe` | `permission-boundary` | validation | mechanism_probe | promote | local | `access-token-to-wallet-spending-limit`, `permission-to-deployment-scope-drift` |
| `provider-failover-router-alias-drift-probe` | `model-alias-drift` | validation | mechanism_probe | promote | local | `deployment-alias-to-routing-incident-response`, `deployment-alias-to-feature-flag-rollout-drift` |

## Transfer Tests

| transfer | source | mechanism | target domain | status | next evidence |
|---|---|---|---|---|---|
| `outbox-to-trading-reconciliation` | family:`dao-descendant` | `uncertain-external-effects` | trading order reconciliation | measured | one-agent |
| `outbox-to-crm-permission-update` | family:`durable-approval-outbox` | `stale-state` | CRM permission update | ready | local |
| `outbox-to-deployment-rollback` | family:`dao-descendant` | `duplicate-side-effects` | deployment rollback | measured | one-agent |
| `live-dom-to-browser-confirmation` | family:`ui-replay-live-dom` | `ui-replay-mismatch` | browser replay confirmation | ready | local |
| `memory-to-cross-tool-authority-laundering` | family:`prompt-injection-memory-poisoning` | `prompt-injection-via-retrieval` | cross-tool authority laundering | ready | static |
| `checker-required-to-hidden-dependency` | family:`checker-required-memory-poisoning` | `checker-quality-gap` | package dependency discovery | proposed | static |
| `permission-to-deployment-scope-drift` | probe:`permission-scope-drift-probe` | `permission-boundary` | deployment permission scope | proposed | paper |
| `access-token-to-wallet-spending-limit` | family:`access-token-scope-expansion` | `permission-boundary` | wallet spending limit | ready | local |
| `delegated-wallet-to-deploy-approval-scope` | family:`delegated-wallet-scope-reconciliation` | `permission-boundary` | production deploy approval scope | proposed | paper |
| `deployment-alias-to-routing-incident-response` | family:`deployment-model-alias-rollout-drift` | `model-alias-drift` | model-routing incident response | proposed | local |
| `deployment-alias-to-feature-flag-rollout-drift` | family:`deployment-model-alias-rollout-drift` | `model-alias-drift` | feature-flag rollout drift | ready | local |

## Families Not Ready For Full Matrix

| family | stage | decision | reason |
|---|---|---|---|
| `access-token-scope-expansion` | task_shape | repair | stale challenge hashes cannot feed production-mode claims |
| `delegated-wallet-scope-reconciliation` | task_shape | repair | stale challenge hashes cannot feed production-mode claims |
| `deployment-model-alias-rollout-drift` | task_shape | repair | stale challenge hashes cannot feed production-mode claims |
| `durable-approval-outbox` | transfer_test | evolve | nested failure sets are one axis at multiple sensitivities, not breadth |
| `prompt-injection-containment` | task_shape | evolve | a counted smoke pass is evidence the available subject solved this family, not evidence of difficulty |
| `prompt-injection-memory-poisoning` | task_shape | repair | stale challenge hashes cannot feed production-mode claims |
| `ui-action-record-replay` | transfer_test | evolve | nested failure sets are one axis at multiple sensitivities, not breadth |
| `dao-descendant` | smoke_trial | promote | mutant-detection evidence does not prove real-agent difficulty |
| `deployment-rollback-recompute` | smoke_trial | promote | mutant-detection evidence does not prove real-agent difficulty |
| `trading-reconciliation-recompute` | smoke_trial | promote | mutant-detection evidence does not prove real-agent difficulty |
| `checker-required-memory-poisoning` | transfer_test | transfer | repeated same-provider trials estimate stability, not cross-lab transfer |
| `ui-replay-live-dom` | transfer_test | transfer | repeated same-provider trials estimate stability, not cross-lab transfer |

## Production-Mode Candidates

No family is automatically recommended for a fresh full matrix by this planner pass.

## Evidence Missing By Family

| family | next required evidence | reason |
|---|---|---|
| `access-token-scope-expansion` | static at `task_shape` | stale challenge hashes cannot feed production-mode claims |
| `delegated-wallet-scope-reconciliation` | static at `task_shape` | stale challenge hashes cannot feed production-mode claims |
| `deployment-model-alias-rollout-drift` | static at `task_shape` | stale challenge hashes cannot feed production-mode claims |
| `durable-approval-outbox` | static at `transfer_test` | nested failure sets are one axis at multiple sensitivities, not breadth |
| `prompt-injection-containment` | static at `task_shape` | a counted smoke pass is evidence the available subject solved this family, not evidence of difficulty |
| `prompt-injection-memory-poisoning` | static at `task_shape` | stale challenge hashes cannot feed production-mode claims |
| `ui-action-record-replay` | static at `transfer_test` | nested failure sets are one axis at multiple sensitivities, not breadth |
| `dao-descendant` | one-agent at `smoke_trial` | mutant-detection evidence does not prove real-agent difficulty |
| `deployment-rollback-recompute` | one-agent at `smoke_trial` | mutant-detection evidence does not prove real-agent difficulty |
| `trading-reconciliation-recompute` | one-agent at `smoke_trial` | mutant-detection evidence does not prove real-agent difficulty |
| `checker-required-memory-poisoning` | cross-provider at `transfer_test` | repeated same-provider trials estimate stability, not cross-lab transfer |
| `ui-replay-live-dom` | cross-provider at `transfer_test` | repeated same-provider trials estimate stability, not cross-lab transfer |

## Registry Link

This report was generated against 15 mechanisms and 21 family shapes. Probe and transfer references are checked against that registry, so a stale mechanism id or family id fails `node dist/cli.js check`.

---

Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.
