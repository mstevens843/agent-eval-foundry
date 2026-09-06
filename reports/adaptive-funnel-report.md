# Adaptive benchmark-production funnel

The foundry is no longer a mostly linear task-family funnel. It now has three explicit modes:
`discovery`, `validation` and `production`. This is a legacy advisory view, not production priority.
Use `package:local learning select INPUT_JSON` for current package-first decisions.
These retained mechanism/axis diagnostics do not establish difficulty or authorize execution.

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
| candidate mechanisms | 16 |
| mechanism probes | 10 |
| probes ready for validation | 4 |
| probes needing repair/hold | 4 |
| transfer tests | 11 |
| transfer tests ready | 5 |
| production-mode families | 1 |

## Cheapest Next Evidence

| cost tier | queued actions |
|---|---:|
| static | 20 |
| local | 7 |
| cross-provider | 1 |

| target | type | mode | stage | decision | evidence cost | next action |
|---|---|---|---|---|---|---|
| `access-token-scope-expansion` | family | validation | task_shape | hold | static | review current package eligibility; retain old trials as historical observations |
| `caa-revalidation` | family | validation | task_shape | hold | static | review current package eligibility; retain old trials as historical observations |
| `checker-required-memory-poisoning` | family | validation | task_shape | hold | static | review current package eligibility; retain old trials as historical observations |
| `dao-descendant` | family | validation | task_shape | hold | static | review current package eligibility; retain old trials as historical observations |
| `delegated-wallet-scope-reconciliation` | family | validation | task_shape | hold | static | review current package eligibility; retain old trials as historical observations |
| `deployment-model-alias-rollout-drift` | family | validation | task_shape | hold | static | review current package eligibility; retain old trials as historical observations |
| `deployment-rollback-recompute` | family | validation | task_shape | hold | static | review current package eligibility; retain old trials as historical observations |
| `durable-approval-outbox` | family | production | full_matrix | promote | cross-provider | review qualified package evidence before any separately authorized matrix |
| `prompt-injection-containment` | family | validation | task_shape | hold | static | review current package eligibility; retain old trials as historical observations |
| `prompt-injection-memory-poisoning` | family | validation | task_shape | hold | static | review current package eligibility; retain old trials as historical observations |
| `trading-reconciliation-recompute` | family | validation | task_shape | hold | static | review current package eligibility; retain old trials as historical observations |
| `ui-action-record-replay` | family | validation | task_shape | hold | static | review current package eligibility; retain old trials as historical observations |
| `ui-replay-live-dom` | family | validation | task_shape | hold | static | review current package eligibility; retain old trials as historical observations |
| `uncertain-external-receipt-probe` | probe | validation | transfer_test | transfer | static | run the declared transfer test before expanding scenarios |

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
| `access-token-scope-expansion` | task_shape | hold | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `caa-revalidation` | task_shape | hold | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `checker-required-memory-poisoning` | task_shape | hold | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `dao-descendant` | task_shape | hold | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `delegated-wallet-scope-reconciliation` | task_shape | hold | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `deployment-model-alias-rollout-drift` | task_shape | hold | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `deployment-rollback-recompute` | task_shape | hold | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `prompt-injection-containment` | task_shape | hold | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `prompt-injection-memory-poisoning` | task_shape | hold | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `trading-reconciliation-recompute` | task_shape | hold | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `ui-action-record-replay` | task_shape | hold | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `ui-replay-live-dom` | task_shape | hold | stale history alone does not establish an unrepaired defect; use the package-first selection policy |

## Production-Mode Candidates

- `durable-approval-outbox`

## Evidence Missing By Family

| family | next required evidence | reason |
|---|---|---|
| `access-token-scope-expansion` | static at `task_shape` | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `caa-revalidation` | static at `task_shape` | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `checker-required-memory-poisoning` | static at `task_shape` | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `dao-descendant` | static at `task_shape` | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `delegated-wallet-scope-reconciliation` | static at `task_shape` | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `deployment-model-alias-rollout-drift` | static at `task_shape` | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `deployment-rollback-recompute` | static at `task_shape` | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `durable-approval-outbox` | cross-provider at `full_matrix` | axis count does not disqualify a valid single-mechanism task; this legacy summary cannot authorize execution |
| `prompt-injection-containment` | static at `task_shape` | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `prompt-injection-memory-poisoning` | static at `task_shape` | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `trading-reconciliation-recompute` | static at `task_shape` | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `ui-action-record-replay` | static at `task_shape` | stale history alone does not establish an unrepaired defect; use the package-first selection policy |
| `ui-replay-live-dom` | static at `task_shape` | stale history alone does not establish an unrepaired defect; use the package-first selection policy |

## Registry Link

This report was generated against 16 mechanisms and 22 family shapes. Probe and transfer references are checked against that registry, so a stale mechanism id or family id fails `node dist/cli.js check`.

---

Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.
