# Promoted Family Build Pipeline v1

This report covers the bridge from discovery candidate to mechanism probe to full validation-mode
family. Promotion evidence is separate from mutant-detection evidence and real-agent difficulty.

## Summary

| item | value |
|---|---:|
| promotions recorded | 3 |
| family-built promotions | 3 |
| probe-promoted sources | 2 |
| counted real-agent trials claimed by promotions | 0 |

## Selected Promotion

Selected promoted probe: `access-token-scope-expansion-probe`.

Source candidate: `access-token-scope-expansion` - OAuth token scope expands after approval summary.

Why selected: The first ranked promoted probe caught scope-widening and stale-token known-bad subjects while the reference-like subject passed.

| evidence | value |
|---|---|
| source probe verdict | promote_to_task_shape |
| reference passed probe | yes |
| bad probe subjects caught | 2/2 |
| distinct probe checks | `current_state_observed`, `decision_matches_truth`, `no_forbidden_effect` |
| claimed evidence level | local-evidence |
| counted real-agent trials | 0 |

### What Stayed Fixed

- Approval binds exact principal, resource and scope.
- Current authority state, not cached display state, decides grant legality.
- Broader token authority is a denial until reauthorization.

### What Changed

- The probe's three cases expand into a cross-product of approval drift, token drift, cache freshness, request surface and repeat count.
- The full family adds duplicate-effect prevention, audit-current-evidence checks and no-op/over-blocker baselines.
- The verifier grades authority calls and effects outside the subject process.

### Risks Introduced

Fairness: The hidden cross-product must remain sampling of public state knobs, not private OAuth semantics.

Verifier: A final success status is insufficient; the verifier must own the grant-effect ledger.

Adversarial: Challenge package must not ship truth, measured scenarios or authority-ledger implementation.

Human solvability: Public spec must explain exact scope/resource/principal equality and repeat-attempt behavior.

### Local Family Evidence

| item | value |
|---|---:|
| measured scenarios | 384 |
| declared space size | 1152 |
| reference failures | 0 |
| intended mutants caught | 8/8 |
| baselines blocked | 2/2 |
| mutant-detection axes | 3 |

Pre-registered confirm signal: Reference passes all measured scenarios and every carried-forward mutant fails its intended named check.

Pre-registered kill signal: A counted smoke trial solves every scenario or failures concentrate only on ambiguous public wording.

### Smoke, Diagnosis And Matrix Gate

| item | status |
|---|---|
| local evidence | pass |
| smoke campaign | counted |
| smoke diagnosis | clean |
| transfer declaration | declared |
| matrix readiness | blocked |
| pipeline state | `smoke-passed-cleanly` |

Blockers:

- clean smoke pass routes to already_solved_or_needs_evolution unless a matrix reason is declared

Next action: treat as already_solved_or_needs_evolution unless a matrix reason is declared

No full matrix command is recommended from this gate state.

## Built Promotion Smoke States

Built promotions are validation-mode families. Their smoke state routes the next action, but
does not retroactively turn promotion evidence into difficulty evidence.

| promotion | family | scenarios | mutant axes | smoke state | counted smoke | matrix | next action |
|---|---|---:|---:|---|---|---|---|
| `access-token-scope-expansion-from-probe` | `access-token-scope-expansion` | 384 | 3 | smoke-passed-cleanly | yes | blocked | treat as already_solved_or_needs_evolution unless a matrix reason is declared |
| `delegated-wallet-scope-reconciliation-from-access-token-evolution` | `delegated-wallet-scope-reconciliation` | 804 | 3 | smoke-passed-cleanly | yes | blocked | treat as already_solved_or_needs_evolution unless a matrix reason is declared |
| `deployment-model-alias-rollout-drift-from-lineage-reallocation` | `deployment-model-alias-rollout-drift` | 339 | 6 | matrix-ready | yes | ready | full matrix may be considered; it is not automatic |

## Ready Promotions

No ready, unbuilt promotions are on record.

## Promotion Ledger

| promotion | family | source candidate | source probe | decision | status | evidence level | probe verdict |
|---|---|---|---|---|---|---|---|
| `access-token-scope-expansion-from-probe` | `access-token-scope-expansion` | `access-token-scope-expansion` | `access-token-scope-expansion-probe` | promote | family-built | local-evidence | promote_to_task_shape |
| `delegated-wallet-scope-reconciliation-from-access-token-evolution` | `delegated-wallet-scope-reconciliation` | `delegated-wallet-scope-reconciliation` | `delegated-wallet-scope-reconciliation-probe` | evolve | family-built | local-evidence | evolve_existing |
| `deployment-model-alias-rollout-drift-from-lineage-reallocation` | `deployment-model-alias-rollout-drift` | `deployment-model-alias-rollout-drift` | `deployment-model-alias-rollout-drift-probe` | promote | family-built | local-evidence | promote_to_task_shape |

## Current Probe Context

Probe queue size: 15. First promoted probe: `access-token-scope-expansion-probe`.

## Evidence Rules

- A promotion can justify build work; it cannot claim model difficulty.
- Local reference/mutant/package evidence is validation-mode evidence.
- A full `/6` matrix stays blocked until smoke trial, diagnosis and transfer evidence exist.
- One OpenAI smoke trial, if run later, remains OpenAI-only and not cross-lab breadth.

---

Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.
