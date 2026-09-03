# Discovery Workbench v1

Discovery Workbench v1 is the machine that feeds the adaptive funnel. It keeps candidate ideas
cheap and comparable before they become task shapes, packages, trials or ship claims.

```text
Candidate -> mechanism probe -> transfer test -> task shape -> family -> trials -> axis analysis -> ship/kill/evolve
```

Candidate score is not difficulty evidence. Probe-ready is not trialed. Surface coverage is not
axis diversity. The workbench routes evidence; it does not prove a benchmark is hard.

## Summary

| item | value |
|---|---:|
| total candidates | 9 |
| mechanisms referenced | 11 |
| domains represented | 9 |
| expected next-batch build hours | 184 |
| expected next-batch trial cost | $324 |
| expected next-batch axes | 34 |
| registry mechanisms available | 15 |

## Recommended Actions

| action | candidates |
|---|---:|
| paper_screen | 1 |
| mechanism_probe | 5 |
| task_shape | 2 |
| hold | 0 |
| kill | 0 |
| evolve_existing | 1 |
| transfer_existing | 0 |

## Top 10 Build/Probe Candidates

| candidate | domain | score | confidence | recommended action | cheapest evidence | probe status | blockers |
|---|---|---:|---:|---|---|---|---|
| `deployment-model-alias-rollout-drift` | deployment rollback | 78.1 | 0.69 | mechanism_probe | static | family-build-ready | none |
| `access-token-scope-expansion` | permissions and access control | 73.4 | 0.69 | mechanism_probe | static | family-build-ready | none |
| `delegated-wallet-scope-reconciliation` | wallet / transaction signing | 67.8 | 0.80 | evolve_existing | static | family-build-ready | none |
| `provider-failover-router-alias-drift` | model-routing incident response | 69.3 | 0.80 | mechanism_probe | local | task-shape-ready | none |
| `payment-unknown-capture-receipt` | external payments | 63.1 | 0.69 | mechanism_probe | static | task-shape-ready | none |
| `prompt-injection-ticket-attachment` | prompt injection | 75.6 | 0.69 | mechanism_probe | static | score-only | none |
| `browser-checkout-stale-selector` | browser UI automation | 65.9 | 0.69 | task_shape | local | score-only | none |
| `trading-partial-fill-cancel` | trading order reconciliation | 65.2 | 0.69 | task_shape | local | score-only | none |

## Probe Evidence Overlay

| candidate | status | probe | verdict | queue reason |
|---|---|---|---|---|
| `access-token-scope-expansion` | task-shape-ready | `access-token-scope-expansion-probe` | promote_to_task_shape | cheap probe caught 2/2 non-reference subjects across 7 named checks |
| `access-token-scope-expansion` | family-build-ready | `access-token-scope-expansion-from-probe` | family-built | The first ranked promoted probe caught scope-widening and stale-token known-bad subjects while the reference-like subject passed. |
| `delegated-wallet-scope-reconciliation` | probe-promoted | `delegated-wallet-scope-reconciliation-probe` | evolve_existing | cheap probe supports evolving an existing family line |
| `delegated-wallet-scope-reconciliation` | family-build-ready | `delegated-wallet-scope-reconciliation-from-access-token-evolution` | family-built | PREMISE WITHDRAWN 2026-09-01. The decision was made on this basis: 'The counted access-token smoke trial passed cleanly, so full matrix spend was blocked and the requested-vs-approved-authority mechanism was carried into a full delegated-wallet authority family with time, revocation, downgrade, reconciliation, audit and liveness pressure.' That smoke pass, `access-token-2026-08-o1` (superseded by the 2026-09-01 challenge migration; it does not count), was graded against a package whose shipped starter failed 0 of 384 scenarios, so it measured the answer key and is superseded: it no longer counts and is not quotable as evidence. The parent was never shown to be solved, and this descendant was therefore built for a reason that did not hold. The family itself is real and locally sound; what is withdrawn is the claim that evolution was the indicated next step. |
| `deployment-model-alias-rollout-drift` | task-shape-ready | `deployment-model-alias-rollout-drift-probe` | promote_to_task_shape | cheap probe caught 6/6 non-reference subjects across 17 named checks |
| `deployment-model-alias-rollout-drift` | family-build-ready | `deployment-model-alias-rollout-drift-from-lineage-reallocation` | family-built | PREMISE WITHDRAWN 2026-09-01. The decision was made on this basis: 'The access-token authority lineage was cleanly solved twice by the same OpenAI subject, so build budget was reallocated to the top non-scope mechanism cluster: deployment model-alias drift.' Both of those solves were graded against packages that shipped their own solution and are superseded and no longer count (`access-token-2026-08-o1` (superseded by the 2026-09-01 challenge migration; it does not count), `delegated-wallet-2026-08-o1` (superseded by the 2026-09-01 challenge migration; it does not count)), so the lineage was never solved once, let alone twice, and the reallocation that produced this promotion is withdrawn with it. This family was nonetheless built, packaged and trialed, and stands or falls on its own evidence rather than on the lineage verdict that motivated it. |
| `payment-unknown-capture-receipt` | task-shape-ready | `payment-unknown-capture-receipt-probe` | promote_to_task_shape | cheap probe caught 3/3 non-reference subjects across 6 named checks |
| `provider-failover-router-alias-drift` | task-shape-ready | `provider-failover-router-alias-drift-probe` | promote_to_task_shape | cheap probe caught 8/8 non-reference subjects across 20 named checks |

## Lineage Feedback Overlay

_No lineage-derived portfolio feedback is active._

## Candidates By Domain

| domain | candidates |
|---|---:|
| browser UI automation | 1 |
| deployment rollback | 1 |
| external payments | 1 |
| model-routing incident response | 1 |
| permissions and access control | 1 |
| prompt injection | 1 |
| trading order reconciliation | 1 |
| wallet / transaction signing | 1 |
| wallet and transaction signing | 1 |

## Candidates By Mechanism

| mechanism | candidates |
|---|---:|
| duplicate-side-effects | 3 |
| false-audit-history | 6 |
| hidden-environment-dependency | 1 |
| liveness-stall | 1 |
| model-alias-drift | 2 |
| permission-boundary | 4 |
| prompt-injection-via-retrieval | 1 |
| stale-state | 7 |
| tool-result-ambiguity | 3 |
| ui-replay-mismatch | 1 |
| uncertain-external-effects | 2 |

## Cheap Kills

_none_

## Needs Repair Or More Paper Evidence

_none_

## Transfer Opportunities

- `prompt-injection-ticket-attachment` -> email calendar, CRM automation (`memory-to-cross-tool-authority-laundering`)
- `access-token-scope-expansion` -> wallet signing, deployment approvals (`access-token-to-wallet-spending-limit`, `permission-to-deployment-scope-drift`)
- `provider-failover-router-alias-drift` -> model-routing incident response, feature-flag rollout drift, provider failover (`deployment-alias-to-routing-incident-response`, `deployment-alias-to-feature-flag-rollout-drift`)
- `delegated-wallet-scope-reconciliation` -> OAuth app consent, API key permission downgrade, production deploy approval scope (`access-token-to-wallet-spending-limit`, `permission-to-deployment-scope-drift`)
- `browser-checkout-stale-selector` -> browser replay confirmation, approval UI (`live-dom-to-browser-confirmation`)
- `trading-partial-fill-cancel` -> payment capture, deployment rollback (`outbox-to-trading-reconciliation`)
- `wallet-multisig-hidden-threshold` -> access control, production approval flows (`permission-to-deployment-scope-drift`)
- `payment-unknown-capture-receipt` -> trading order reconciliation, deployment rollback (`outbox-to-trading-reconciliation`, `outbox-to-deployment-rollback`)

## Surface Coverage

Surface coverage is separate from defect-axis diversity. A broad product/API surface can still
measure one defect, and a strong defect axis can still cover one narrow product surface.

| coverage group | distinct tags | tags |
|---|---:|---|
| domains | 12 | `access-control`, `browser-ui`, `commerce`, `deployment`, `model-routing`, `oauth`, `payments`, `permissions`, `prompt-injection`, `support`, `trading`, `wallet` |
| toolActionTypes | 21 | `authorize`, `cancel-order`, `capture`, `click`, `failback-provider`, `grant-token`, `place-order`, `quarantine-route`, `read-attachment`, `read-authority`, `read-router-receipt`, `reconcile`, `refund`, `replay`, `resolve-alias`, `rollback-route`, `rollout`, `route-task`, `sign-transaction`, `submit`, `write-audit` |
| statePatterns | 22 | `alias-drift`, `anchor-conflict`, `bounded-liveness`, `delayed-receipt`, `delegation-chain`, `epoch-change`, `failover`, `late-receipt`, `ledger-disagreement`, `mixed-provider-eval`, `partial-effect`, `payload-mutation`, `provenance`, `retrieval`, `revocation`, `scope-downgrade`, `scope-drift`, `stale-authority`, `stale-generation`, `stale-handle`, `stale-policy`, `unknown-effect` |
| authorityModels | 11 | `browser-effect-ledger`, `delegated-authority-ledger`, `exchange-ledger`, `harness-ledger`, `policy-intersection`, `policy-ledger`, `policy-manifest`, `policy-snapshot`, `registry-snapshot`, `rollout-ledger`, `router-receipt-ledger` |
| externalSystems | 13 | `browser`, `delegation-receipt-feed`, `eval-stream`, `exchange`, `model-registry`, `model-router`, `multisig-policy-service`, `oauth-server`, `payment-processor`, `provider-gateway`, `refund-api`, `ticket-system`, `wallet-ledger` |
| uiApiWorkflowSurfaces | 3 | `api`, `ui`, `workflow` |
| riskCategories | 11 | `audit-history`, `authorization`, `data-access`, `duplicate-effect`, `hidden-dependency`, `model-drift`, `money`, `permission-boundary`, `production-impact`, `prompt-injection`, `ui-replay` |
| defect mechanisms | 11 | `duplicate-side-effects`, `false-audit-history`, `hidden-environment-dependency`, `liveness-stall`, `model-alias-drift`, `permission-boundary`, `prompt-injection-via-retrieval`, `stale-state`, `tool-result-ambiguity`, `ui-replay-mismatch`, `uncertain-external-effects` |

## Warnings

- top-ranked candidates over-concentrate on one mechanism; run a surface-diversity pass

## Full Queue

| candidate | domain | score | confidence | recommended action | cheapest evidence | blockers |
|---|---|---:|---:|---|---|---|
| `deployment-model-alias-rollout-drift` | deployment rollback | 78.1 | 0.69 | mechanism_probe | static | none |
| `prompt-injection-ticket-attachment` | prompt injection | 75.6 | 0.69 | mechanism_probe | static | none |
| `access-token-scope-expansion` | permissions and access control | 73.4 | 0.69 | mechanism_probe | static | none |
| `provider-failover-router-alias-drift` | model-routing incident response | 69.3 | 0.80 | mechanism_probe | local | none |
| `delegated-wallet-scope-reconciliation` | wallet / transaction signing | 67.8 | 0.80 | evolve_existing | static | none |
| `browser-checkout-stale-selector` | browser UI automation | 65.9 | 0.69 | task_shape | local | none |
| `trading-partial-fill-cancel` | trading order reconciliation | 65.2 | 0.69 | task_shape | local | none |
| `wallet-multisig-hidden-threshold` | wallet and transaction signing | 63.4 | 0.69 | paper_screen | paper | none |
| `payment-unknown-capture-receipt` | external payments | 63.1 | 0.69 | mechanism_probe | static | none |

## Evidence Routing Rules

- Do not promote raw difficulty if fairness or verifier feasibility is low.
- Do not run model trials when paper/static/local/mutant evidence can decide the next step.
- Do not treat repeated same-provider runs as cross-lab breadth.
- Do not call a transfer path proven until the target domain has required evidence.
- Do not treat surface breadth as independent failure-axis breadth.
- Do not let a score-only candidate outrank a lower-score candidate with better executable probe evidence.

---

Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.
