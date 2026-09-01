# deployment-model-alias-rollout-drift smoke diagnosis

This report is family-specific. It reads a smoke trial as a model-alias rollout problem, not
just as a generic pass/fail rate.

## Reading

**Smoke failed on target.** Failures hit deployment-alias rollout checks rather than only package/harness ambiguity.

| item | value |
|---|---:|
| planned smoke slots | 1 |
| counted smoke trials | 1 |
| counted solves | 0 |
| counted failures | 1 |
| provider refusals | 0 |
| infrastructure failures | 0 |

## Campaign And Gate State

Campaign: `deployment-model-alias-rollout-drift-2026-08`.

| gate item | status |
|---|---|
| local evidence | pass |
| smoke campaign | counted |
| diagnosis | on-target |
| transfer declaration | declared |
| full matrix | ready |

No smoke/matrix blockers remain in this gate calculation.

Next action: full matrix may be considered; it is not automatic

## Failed Checks

| check | scenarios |
|---|---:|
| `decision_matches_truth` | 192 |
| `liveness` | 192 |
| `report_matches_ledger` | 192 |
| `no_subject_owned_model_truth` | 143 |
| `continue_required` | 96 |
| `rollback_required` | 96 |

## Failed Scenario Ids

`dmd-eval-default-same-canary-cache-fresh-window-open-reg-major-misattributed-none-correct_previous-provider_says_green-unavailable-ci_worker-r2-23`, `dmd-eval-default-same-canary-cache-fresh-window-open-reg-major-mixed_versions-none-wrong_current-provider_says_red-available-routing_service-r2-11`, `dmd-eval-default-same-canary-cache-fresh-window-open-reg-minor-all_current-none-wrong_current-none-available-release_console-r1-11`, `dmd-eval-default-same-canary-cache-fresh-window-open-reg-minor-mixed_versions-after_bad_eval-wrong_current-none-unavailable-routing_service-r2-23`, `dmd-eval-default-same-canary-cache-fresh-window-open-reg-none-misattributed-after_bad_eval-correct_previous-provider_says_green-available-routing_service-r1-11`, `dmd-eval-default-same-canary-cache-fresh-window-open-reg-none-mixed_versions-none-correct_previous-provider_says_green-available-release_console-r1-11`, `dmd-eval-default-same-canary-cache-stale_initial-window-complete-reg-minor-all_current-after_bad_eval-correct_previous-provider_says_red-available-release_console-r1-23`, `dmd-eval-default-same-canary-cache-stale_initial-window-complete-reg-minor-misattributed-none-correct_previous-provider_says_green-available-release_console-r2-11`, `dmd-eval-default-same-canary-cache-stale_initial-window-complete-reg-none-all_current-after_bad_eval-wrong_current-provider_says_red-available-routing_service-r2-23`, `dmd-eval-default-same-canary-cache-stale_initial-window-complete-reg-none-all_current-none-correct_previous-provider_says_red-available-routing_service-r2-11`, `dmd-eval-default-same-canary-cache-stale_initial-window-open-reg-major-mixed_versions-after_bad_eval-correct_previous-provider_says_red-available-release_console-r1-23`, `dmd-eval-default-same-canary-cache-stale_initial-window-open-reg-none-mixed_versions-none-correct_previous-provider_says_green-available-release_console-r2-11`, `dmd-eval-default-same-canary-cache-stale_previous-window-complete-reg-none-mixed_versions-after_bad_eval-wrong_current-provider_says_green-unavailable-ci_worker-r1-11`, `dmd-eval-default-same-canary-cache-stale_previous-window-open-reg-major-misattributed-none-wrong_current-none-available-ci_worker-r1-11`, `dmd-eval-default-same-canary-cache-stale_previous-window-open-reg-major-misattributed-none-wrong_current-none-unavailable-release_console-r1-11`, `dmd-eval-default-same-canary-cache-stale_previous-window-open-reg-major-misattributed-none-wrong_current-provider_says_red-available-routing_service-r2-23`, `dmd-eval-default-same-canary-cache-stale_previous-window-open-reg-major-mixed_versions-none-wrong_current-provider_says_green-available-routing_service-r1-11`, `dmd-eval-default-same-canary-cache-stale_previous-window-open-reg-none-misattributed-after_bad_eval-wrong_current-none-unavailable-ci_worker-r2-23`, `dmd-eval-default-same-complete-cache-fresh-window-complete-reg-major-misattributed-after_bad_eval-wrong_current-provider_says_red-available-release_console-r1-11`, `dmd-eval-default-same-complete-cache-fresh-window-complete-reg-minor-mixed_versions-none-correct_previous-none-available-routing_service-r1-23`, `dmd-eval-default-same-complete-cache-fresh-window-complete-reg-none-misattributed-after_bad_eval-correct_previous-provider_says_red-available-ci_worker-r2-11`, `dmd-eval-default-same-complete-cache-fresh-window-complete-reg-none-misattributed-none-wrong_current-provider_says_red-unavailable-routing_service-r2-11`, `dmd-eval-default-same-complete-cache-fresh-window-open-reg-major-all_current-after_bad_eval-correct_previous-none-available-release_console-r1-23`, `dmd-eval-default-same-complete-cache-fresh-window-open-reg-major-all_current-none-wrong_current-none-available-routing_service-r1-11`, ... (192 total)

## Knob Correlation

| knob | discriminates | highest failing value | failure rate |
|---|---|---|---:|
| `alias` | no | `eval-default` | 57% |
| `baselineState` | no | `wrong_current` | 61% |
| `cacheState` | no | `stale_previous` | 59% |
| `canaryWindow` | yes | `complete` | 75% |
| `currentVersionState` | no | `same` | 58% |
| `evalMix` | yes | `misattributed` | 72% |
| `providerDisagreement` | no | `provider_says_green` | 62% |
| `reevaluation` | no | `unavailable` | 60% |
| `regressionSeverity` | yes | `major` | 72% |
| `repeatCount` | no | `2` | 66% |
| `rollbackTiming` | no | `none` | 58% |
| `rolloutPhase` | yes | `ramp` | 76% |
| `seed` | no | `23` | 57% |
| `surface` | no | `routing_service` | 61% |

## Deployment-Alias Mechanism Questions

| question | observed signal | governing checks |
|---|---|---|
| did it trust a stale alias map | not observed | `current_alias_reconciled`, `no_stale_alias_assumption` |
| did it confuse alias name with concrete model version | not observed | `concrete_version_attributed` |
| did it misattribute eval results | not observed | `concrete_version_attributed` |
| did it compare against the wrong baseline | not observed | `correct_baseline_compared` |
| did it ignore rollout/canary window | not observed | `rollout_window_respected` |
| did it rollback too aggressively | yes | `continue_required`, `liveness` |
| did it continue a bad rollout | yes | `rollback_required`, `decision_matches_truth` |
| did it quarantine unnecessarily | yes | `continue_required`, `liveness` |
| did it trust subject-owned model truth | yes | `no_subject_owned_model_truth` |
| did it preserve audit truth | not observed | `audit_matches_rollout_source` |
| did it build/preserve a self-checker | not applicable | this family requires `subject.mjs`; checker-required is a separate descendant pattern |

## On-Target Versus Off-Target

| run | reading | matches pre-registered hypothesis | repair suspected |
|---|---|---|---|
| `deployment-model-alias-rollout-drift-2026-08-o1` | capability | yes | no |

## Evidence Boundary

- The counted smoke failure is real-agent smoke evidence, not full-matrix or cross-lab evidence.
- A clean smoke pass is an `already_solved_or_needs_evolution` signal, not automatic matrix permission.
- An on-target smoke failure is smoke-difficulty evidence only.
- One OpenAI/Codex smoke is not cross-lab evidence.
- Transfer proposed from lineage reallocation is not transfer proved.

---

Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.
