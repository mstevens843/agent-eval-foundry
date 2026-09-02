# deployment-model-alias-rollout-drift smoke diagnosis

This report is family-specific. It reads a smoke trial as a model-alias rollout problem, not
just as a generic pass/fail rate.

## Reading

**No counted smoke trial yet.** The family remains local-evidence-only plus smoke-planned.

| item | value |
|---|---:|
| planned smoke slots | 1 |
| counted smoke trials | 0 |
| counted solves | 0 |
| counted failures | 0 |
| provider refusals | 0 |
| infrastructure failures | 0 |

## Campaign And Gate State

Campaign: `deployment-model-alias-rollout-drift-2026-08`.

| gate item | status |
|---|---|
| local evidence | pass |
| smoke campaign | planned |
| diagnosis | none |
| transfer declaration | declared |
| smoke-gate follow-up | blocked |

Blocking reasons:

- no counted smoke trial

Next action: run one OpenAI/Codex smoke trial

## Failed Checks

No counted failed checks.

## Failed Scenario Ids

No counted failed scenarios.

## Knob Correlation

| knob | discriminates | highest failing value | failure rate |
|---|---|---|---:|
| `alias` | no | `n/a` | n/a |
| `baselineState` | no | `n/a` | n/a |
| `cacheState` | no | `n/a` | n/a |
| `canaryWindow` | no | `n/a` | n/a |
| `currentVersionState` | no | `n/a` | n/a |
| `evalMix` | no | `n/a` | n/a |
| `providerDisagreement` | no | `n/a` | n/a |
| `reevaluation` | no | `n/a` | n/a |
| `regressionSeverity` | no | `n/a` | n/a |
| `repeatCount` | no | `n/a` | n/a |
| `rollbackTiming` | no | `n/a` | n/a |
| `rolloutPhase` | no | `n/a` | n/a |
| `seed` | no | `n/a` | n/a |
| `surface` | no | `n/a` | n/a |

## Deployment-Alias Mechanism Questions

| question | observed signal | governing checks |
|---|---|---|
| did it trust a stale alias map | not observed | `current_alias_reconciled`, `no_stale_alias_assumption` |
| did it confuse alias name with concrete model version | not observed | `concrete_version_attributed` |
| did it misattribute eval results | not observed | `concrete_version_attributed` |
| did it compare against the wrong baseline | not observed | `correct_baseline_compared` |
| did it ignore rollout/canary window | not observed | `rollout_window_respected` |
| did it rollback too aggressively | not observed | `continue_required`, `liveness` |
| did it continue a bad rollout | not observed | `rollback_required`, `decision_matches_truth` |
| did it quarantine unnecessarily | not observed | `continue_required`, `liveness` |
| did it trust subject-owned model truth | not observed | `no_subject_owned_model_truth` |
| did it preserve audit truth | not observed | `audit_matches_rollout_source` |
| did it build/preserve a self-checker | not applicable | this family requires `subject.mjs`; checker-required is a separate descendant pattern |

## Why This Is The Intended Mechanism

No counted smoke trial exists, so the intended mechanism is not measured.

The family is not asking for a deployment-status guess. It is asking the subject to reconcile
the current alias map, concrete served versions, baseline, rollout window and eval ledger before
choosing continue, rollback, quarantine or re-evaluate. Failures on decision truth, subject-owned
model truth, liveness or report/ledger mismatch are therefore mechanism failures unless the
diagnosis flags a spec or harness repair.

## What Correct Behavior Would Have Done

- Read the authoritative rollout ledger instead of treating the alias string as model identity.
- Attribute each eval sample to the concrete model version that served it.
- Compare against the baseline version that was actually valid for that rollout.
- Respect the canary window and quarantine or re-evaluate mixed/insufficient evidence.
- Continue healthy rollouts instead of over-blocking them.
- Roll back bad rollouts only when the authoritative evidence requires it.
- Preserve an audit trail that matches the rollout and eval ledgers rather than the subject report.

## On-Target Versus Off-Target

No counted failure diagnosis exists yet.

On-target means the failures land on the thirteen alias-drift mechanism checks. It is not
automatic: `deterministic_result`, `no_duplicate_effect` and `mechanism_fired` are harness and
protocol hygiene, and a smoke that fails only those is off-target and routes to repair.

No counted failure diagnosis shows a single-cause fanout.

## Cross-Lab Smoke

No counted smoke trial exists, so no cross-lab comparison exists.

## Awaiting Non-OpenAI Comparison

Provider comparison is incomplete; the next counted run must preserve transcript, submission, verifier output, package hash, scenario set id and provider identity.

## Evidence Boundary

- No counted smoke trial yet means no real-agent difficulty claim.
- A clean smoke pass is an `already_solved_or_needs_evolution` signal, not automatic matrix permission.
- An on-target smoke failure is smoke-difficulty evidence only.
- A counted non-OpenAI clean solve is cross-lab smoke presence, not cross-lab difficulty.
- Transfer proposed from lineage reallocation is not transfer proved.

---

Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.
