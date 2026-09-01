# deployment-model-alias-rollout-drift provider-delta diagnosis

This report explains the mixed smoke result using preserved artifacts only. It does not run a
model, execute a production matrix, or create new difficulty evidence.

## Verdict

| item | value |
|---|---|
| family | `deployment-model-alias-rollout-drift` |
| challenge hash | `0e9b87a5f260544cfbc1cdce8f08938c` |
| scenario set | `drift-339-590affe3` |
| verdicts | `openai_specific_failure`, `non_openai_solver_delta`, `implementation_strategy_delta`, `matrix_still_blocked`, `evolution_recommended`, `same_provider_stability_recommended` |
| route | `evolve_family` |
| confidence | `high` |
| confidence reason | Preserved submissions are present and static strategy signals differ, matching the mixed provider outcome. |
| exact next route | select an evolution probe that adds a harder evidence boundary before production matrix spend |

## Subject Summary

| run | provider | model | status | graded | failed | artifact | transcript | hash |
|---|---|---|---|---:|---:|---|---|---|
| `deployment-alias-2026-09-claude-1` | `anthropic` | `anthropic/claude-opus-5` | `counted_solve` | 339 | 0 | present | present | current |
| `deployment-model-alias-rollout-drift-2026-08-o1` | `openai` | `openai/gpt-5.6-sol` | `counted_failure` | 339 | 192 | present | present | current |

## OpenAI Result

OpenAI/Codex run `deployment-model-alias-rollout-drift-2026-08-o1` failed 192 of 339 graded scenarios.

## Non-OpenAI Result

Claude/Anthropic run `deployment-alias-2026-09-claude-1` passed all 339 graded scenarios.

## Failure Overlap

| pair | left failures | right failures | overlap | jaccard | relation |
|---|---:|---:|---:|---:|---|
| `deployment-model-alias-rollout-drift-2026-08-o1` / `deployment-alias-2026-09-claude-1` | 192 | 0 | 0 | 0.00 | `one_clean_one_failing` |

## OpenAI Failed Checks

| check | scenarios |
|---|---:|
| `decision_matches_truth` | 192 |
| `liveness` | 192 |
| `report_matches_ledger` | 192 |
| `no_subject_owned_model_truth` | 143 |
| `continue_required` | 96 |
| `rollback_required` | 96 |

## Knob Correlations

| knob | discriminates | highest failing value | high rate | low rate |
|---|---|---|---:|---:|
| `rolloutPhase` | yes | `ramp` | 76% | 0% |
| `canaryWindow` | yes | `complete` | 75% | 0% |
| `evalMix` | yes | `misattributed` | 72% | 0% |
| `regressionSeverity` | yes | `major` | 72% | 0% |
| `repeatCount` | no | `2` | 66% | 49% |
| `providerDisagreement` | no | `provider_says_green` | 62% | 47% |
| `surface` | no | `routing_service` | 61% | 54% |
| `baselineState` | no | `wrong_current` | 61% | 53% |
| `reevaluation` | no | `unavailable` | 60% | 54% |
| `cacheState` | no | `stale_previous` | 59% | 54% |

## Artifact Strategy Signals

| signal | OpenAI | non-OpenAI | reading |
|---|---|---|---|
| authoritative rollout/eval/baseline reads | present | present | both submissions expose this static signal; the delta must be read from behavior and failed checks |
| concrete version attribution | present | present | both submissions expose this static signal; the delta must be read from behavior and failed checks |
| canary/window handling | present | present | both submissions expose this static signal; the delta must be read from behavior and failed checks |
| quarantine threshold handling | absent | present | solver models the quarantine threshold that the failing submission appears to omit |
| mixed-version stream handling | present | present | both submissions expose this static signal; the delta must be read from behavior and failed checks |
| negative threshold convention handling | absent | present | solver guards threshold sign conventions that the failing submission does not |
| idempotency/effect ledger handling | present | present | both submissions expose this static signal; the delta must be read from behavior and failed checks |
| subject-owned truth rejected | present | present | both submissions expose this static signal; the delta must be read from behavior and failed checks |

## What Claude Appears To Handle Correctly

- reads current alias, rollout ledger, eval stream and baseline facades
- tracks concrete served model versions
- keeps baseline comparison versioned
- models rollout/canary window state
- handles quarantine thresholds
- handles mixed-version eval streams
- tracks idempotency/effect ledger state
- explicitly rejects subject-owned truth

## Where OpenAI Failed

OpenAI failed 192/339 scenarios.

Top failed checks: `decision_matches_truth`, `liveness`, `report_matches_ledger`, `no_subject_owned_model_truth`, `continue_required`, `rollback_required`.

Failure rates varied most on: `rolloutPhase`, `canaryWindow`, `evalMix`, `regressionSeverity`.

## Route

- Claude solving means this is not cross-lab difficulty evidence.
- OpenAI failing still matters, but only as OpenAI smoke difficulty.
- Mixed provider smoke blocks production `/6` by default.
- The next step is diagnosis/evolution, not matrix spend.
- Same-provider OpenAI repeats can estimate stability only if explicitly approved.

## Findings

### Blockers

| code | detail |
|---|---|
| `PROVIDER_DELTA_DIAGNOSIS_MIXED_MATRIX_BLOCKED` | OpenAI failed on target but a current non-OpenAI run solved, so production /6 remains blocked by default |

### Advisories

| code | detail |
|---|---|
| `PROVIDER_DELTA_DIAGNOSIS_NOT_DIFFICULTY_EVIDENCE` | provider-delta diagnosis explains existing evidence and does not create a new trial or difficulty claim |
| `PROVIDER_DELTA_DIAGNOSIS_SAME_PROVIDER_STABILITY_ONLY` | two more OpenAI repeats would estimate same-provider stability only, not cross-lab breadth |

## Evidence Boundary

| claim | made? |
|---|---|
| new difficulty evidence | no |
| cross-lab difficulty | no |
| matrix readiness | no |
| human evidence | no |
| new model trial | no |

Provider-delta diagnosis reads preserved artifacts and routes next work; it is not a model trial, human solve, or full-matrix result.

---

Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.
