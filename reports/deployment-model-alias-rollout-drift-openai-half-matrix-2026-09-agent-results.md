# Agent trial results — deployment-model-alias-rollout-drift

**1 counted agent trial(s): 1 failed at least one scenario, 0 passed everything.**

The family **discriminates**: at least one real attempt failed, so the suite separates something.

## Outcomes, kept apart

| kind | count | what it means |
|---|---:|---|
| `counted_solve` | 0 | **counted solve** — a real attempt that passed every graded scenario |
| `counted_failure` | 1 | **counted failure** — a real attempt that failed at least one scenario |
| `provider_refusal` | 0 | provider refusal — no attempt was made; never counted |
| `infra_failure` | 0 | infrastructure failure — the harness, not the subject; never counted |
| `not_run` | 2 | not run — a declared slot with no attempt yet |

A refusal is not a failure and an unrun slot is not a pass. The two rows most often merged are
`provider_refusal` and `counted_failure`, and merging them is how a benchmark reports difficulty
it never measured.

## Per trial

| run | model | outcome | graded | failed | runtime |
|---|---|---|---:|---:|---:|
| `deployment-model-alias-rollout-drift-2026-08-o1` | openai/gpt-5.6-sol | counted_failure | 339 | 192 | 422s |
| `deployment-model-alias-rollout-drift-openai-half-matrix-2026-09:o2:not_run` | openai/gpt-5.6-sol | not_run | 0 | 0 | — |
| `deployment-model-alias-rollout-drift-openai-half-matrix-2026-09:o3:not_run` | openai/gpt-5.6-sol | not_run | 0 | 0 | — |

## Which checks failed

Pooled across counted trials. A check that never fires is not evidence it cannot.

| check | scenarios |
|---|---:|
| `decision_matches_truth` | 192 |
| `liveness` | 192 |
| `report_matches_ledger` | 192 |
| `no_subject_owned_model_truth` | 143 |
| `continue_required` | 96 |
| `rollback_required` | 96 |

## Where the failures fall

The analysis that decides whether an evolution operator worked. A knob whose values produce
different failure rates is a knob that is doing something; a flat split means the difficulty
came from somewhere else.

### `alias`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `eval-default` | 162 | 93 | 57% |
| `prod-chat` | 177 | 99 | 56% |

### `baselineState`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `correct_previous` | 188 | 100 | 53% |
| `wrong_current` | 151 | 92 | 61% |

### `cacheState`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `fresh` | 116 | 63 | 54% |
| `stale_initial` | 111 | 63 | 57% |
| `stale_previous` | 112 | 66 | 59% |

### `canaryWindow` — **the failure rate moves with this knob**

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `closed` | 79 | 0 | 0% |
| `complete` | 117 | 88 | 75% |
| `open` | 143 | 104 | 73% |

### `currentVersionState`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `same` | 185 | 108 | 58% |
| `successor` | 154 | 84 | 55% |

### `evalMix` — **the failure rate moves with this knob**

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `all_current` | 109 | 59 | 54% |
| `insufficient` | 42 | 0 | 0% |
| `misattributed` | 93 | 67 | 72% |
| `mixed_versions` | 95 | 66 | 69% |

### `providerDisagreement`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `none` | 105 | 49 | 47% |
| `provider_says_green` | 123 | 76 | 62% |
| `provider_says_red` | 111 | 67 | 60% |

### `reevaluation`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `available` | 184 | 99 | 54% |
| `unavailable` | 155 | 93 | 60% |

### `regressionSeverity` — **the failure rate moves with this knob**

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `major` | 134 | 96 | 72% |
| `minor` | 67 | 46 | 69% |
| `none` | 96 | 50 | 52% |
| `unknown` | 42 | 0 | 0% |

### `repeatCount`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `1` | 187 | 91 | 49% |
| `2` | 152 | 101 | 66% |

### `rollbackTiming`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `after_bad_eval` | 151 | 83 | 55% |
| `none` | 188 | 109 | 58% |

### `rolloutPhase` — **the failure rate moves with this knob**

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `canary` | 78 | 58 | 74% |
| `complete` | 110 | 68 | 62% |
| `pre_canary` | 64 | 0 | 0% |
| `ramp` | 87 | 66 | 76% |

### `seed`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `11` | 172 | 96 | 56% |
| `23` | 167 | 96 | 57% |

### `surface`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `ci_worker` | 96 | 54 | 56% |
| `release_console` | 143 | 77 | 54% |
| `routing_service` | 100 | 61 | 61% |

**4 knob(s) move the failure rate: `canaryWindow`, `evalMix`, `regressionSeverity`, `rolloutPhase`.**

## Model coverage

Counted trials come from **one model family** (openai). One family has no measured variance: a result here says what that lab's model does, not what models do. The unrun slots in the campaign are the planned fix, and they are still unrun.

## Against the pre-registration

**Kill signal was:** If the two remaining OpenAI/Codex repeats pass cleanly or fail only off-target while the existing smoke remains the only failure, route the family to repair or evolve before production spend. A provider refusal, infrastructure error, stale hash, missing transcript or missing verifier output counts nothing.

**Confirm signal was:** If the two remaining OpenAI/Codex repeats also fail on intended deployment-alias checks under the current hash, the family gains same-provider stability evidence. That still is not cross-lab evidence and still does not satisfy the full /6 matrix gate without a non-OpenAI counted smoke.

**The kill signal did not fire.** Read the knob splits above against the confirm signal: the claim is only as strong as the pattern, not the pass rate.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
