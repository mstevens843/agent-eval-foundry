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
| mechanism probes | 9 |
| probes ready for validation | 3 |
| probes needing repair/hold | 4 |
| transfer tests | 11 |
| transfer tests ready | 6 |
| production-mode families | 0 |

## Cheapest Next Evidence

| cost tier | queued actions |
|---|---:|
| static | 13 |
| local | 7 |
| cross-provider | 3 |

| target | type | mode | stage | decision | evidence cost | next action |
|---|---|---|---|---|---|---|
| `access-token-scope-expansion` | family | validation | task_shape | evolve | static | treat the clean smoke pass as already_solved_or_needs_evolution before matrix spend |
| `audit-history-rewrite-probe` | probe | validation | transfer_test | transfer | static | run the declared transfer test before expanding scenarios |
| `cross-tool-authority-laundering-probe` | probe | discovery | mechanism_probe | hold | static | run or repair the cheapest declared mechanism screen |
| `delegated-wallet-scope-reconciliation` | family | validation | task_shape | evolve | static | treat the clean smoke pass as already_solved_or_needs_evolution before matrix spend |
| `durable-memory-injection-probe` | probe | validation | task_shape | promote | static | promote probe into a full task shape |
| `hidden-dependency-discovery-probe` | probe | discovery | mechanism_probe | repair | static | run or repair the cheapest declared mechanism screen |
| `memory-to-cross-tool-authority-laundering` | transfer | validation | transfer_test | transfer | static | execute the transfer test and require preserved evidence before claiming transfer |
| `outbox-to-trading-reconciliation` | transfer | validation | transfer_test | transfer | static | execute the transfer test and require preserved evidence before claiming transfer |
| `permission-scope-drift-probe` | probe | discovery | mechanism_probe | hold | static | run or repair the cheapest declared mechanism screen |
| `prompt-injection-containment` | family | validation | task_shape | evolve | static | treat the clean smoke pass as already_solved_or_needs_evolution before matrix spend |
| `prompt-injection-memory-poisoning` | family | validation | task_shape | repair | static | repair/reissue the package and invalidate stale evidence before further trials |
| `ui-action-record-replay` | family | validation | transfer_test | evolve | static | evolve or transfer before broad ship claims |
| `uncertain-external-receipt-probe` | probe | validation | transfer_test | transfer | static | run the declared transfer test before expanding scenarios |
| `access-token-to-wallet-spending-limit` | transfer | validation | transfer_test | transfer | local | execute the transfer test and require preserved evidence before claiming transfer |

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

## Transfer Tests

| transfer | source | mechanism | target domain | status | next evidence |
|---|---|---|---|---|---|
| `outbox-to-trading-reconciliation` | family:`durable-approval-outbox` | `uncertain-external-effects` | trading order reconciliation | ready | static |
| `outbox-to-crm-permission-update` | family:`durable-approval-outbox` | `stale-state` | CRM permission update | ready | local |
| `outbox-to-deployment-rollback` | family:`durable-approval-outbox` | `duplicate-side-effects` | deployment rollback | proposed | paper |
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
| `access-token-scope-expansion` | task_shape | evolve | a counted smoke pass is evidence the available subject solved this family, not evidence of difficulty |
| `delegated-wallet-scope-reconciliation` | task_shape | evolve | a counted smoke pass is evidence the available subject solved this family, not evidence of difficulty |
| `prompt-injection-containment` | task_shape | evolve | a counted smoke pass is evidence the available subject solved this family, not evidence of difficulty |
| `prompt-injection-memory-poisoning` | task_shape | repair | stale challenge hashes cannot feed production-mode claims |
| `ui-action-record-replay` | transfer_test | evolve | nested failure sets are one axis at multiple sensitivities, not breadth |
| `checker-required-memory-poisoning` | transfer_test | transfer | repeated same-provider trials estimate stability, not cross-lab transfer |
| `deployment-model-alias-rollout-drift` | transfer_test | transfer | repeated same-provider trials estimate stability, not cross-lab transfer |
| `ui-replay-live-dom` | transfer_test | transfer | repeated same-provider trials estimate stability, not cross-lab transfer |

## Production-Mode Candidates

No family is automatically recommended for a fresh full matrix by this planner pass.

## Evidence Missing By Family

| family | next required evidence | reason |
|---|---|---|
| `access-token-scope-expansion` | static at `task_shape` | a counted smoke pass is evidence the available subject solved this family, not evidence of difficulty |
| `delegated-wallet-scope-reconciliation` | static at `task_shape` | a counted smoke pass is evidence the available subject solved this family, not evidence of difficulty |
| `prompt-injection-containment` | static at `task_shape` | a counted smoke pass is evidence the available subject solved this family, not evidence of difficulty |
| `prompt-injection-memory-poisoning` | static at `task_shape` | stale challenge hashes cannot feed production-mode claims |
| `ui-action-record-replay` | static at `transfer_test` | nested failure sets are one axis at multiple sensitivities, not breadth |
| `checker-required-memory-poisoning` | cross-provider at `transfer_test` | repeated same-provider trials estimate stability, not cross-lab transfer |
| `deployment-model-alias-rollout-drift` | cross-provider at `transfer_test` | repeated same-provider trials estimate stability, not cross-lab transfer |
| `ui-replay-live-dom` | cross-provider at `transfer_test` | repeated same-provider trials estimate stability, not cross-lab transfer |

## Registry Link

This report was generated against 15 mechanisms and 18 family shapes. Probe and transfer references are checked against that registry, so a stale mechanism id or family id fails `node dist/cli.js check`.

---

Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.
