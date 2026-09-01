# Agent trial results — deployment-model-alias-rollout-drift

**2 counted agent trial(s): 1 failed at least one scenario, 1 passed everything.**

The family **discriminates**: at least one real attempt failed, so the suite separates something.

## Outcomes, kept apart

| kind | count | what it means |
|---|---:|---|
| `counted_solve` | 1 | **counted solve** — a real attempt that passed every graded scenario |
| `counted_failure` | 1 | **counted failure** — a real attempt that failed at least one scenario |
| `provider_refusal` | 0 | provider refusal — no attempt was made; never counted |
| `infra_failure` | 0 | infrastructure failure — the harness, not the subject; never counted |
| `not_run` | 0 | not run — a declared slot with no attempt yet |

A refusal is not a failure and an unrun slot is not a pass. The two rows most often merged are
`provider_refusal` and `counted_failure`, and merging them is how a benchmark reports difficulty
it never measured.

## Per trial

| run | model | outcome | graded | failed | runtime |
|---|---|---|---:|---:|---:|
| `deployment-alias-2026-09-claude-1` | anthropic/claude-opus-5 | counted_solve | 339 | 0 | — |
| `deployment-model-alias-rollout-drift-2026-08-o1` | openai/gpt-5.6-sol | counted_failure | 339 | 192 | 422s |

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
| `eval-default` | 324 | 93 | 29% |
| `prod-chat` | 354 | 99 | 28% |

### `baselineState`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `correct_previous` | 376 | 100 | 27% |
| `wrong_current` | 302 | 92 | 30% |

### `cacheState`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `fresh` | 232 | 63 | 27% |
| `stale_initial` | 222 | 63 | 28% |
| `stale_previous` | 224 | 66 | 29% |

### `canaryWindow` — **the failure rate moves with this knob**

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `closed` | 158 | 0 | 0% |
| `complete` | 234 | 88 | 38% |
| `open` | 286 | 104 | 36% |

### `currentVersionState`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `same` | 370 | 108 | 29% |
| `successor` | 308 | 84 | 27% |

### `evalMix` — **the failure rate moves with this knob**

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `all_current` | 218 | 59 | 27% |
| `insufficient` | 84 | 0 | 0% |
| `misattributed` | 186 | 67 | 36% |
| `mixed_versions` | 190 | 66 | 35% |

### `providerDisagreement`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `none` | 210 | 49 | 23% |
| `provider_says_green` | 246 | 76 | 31% |
| `provider_says_red` | 222 | 67 | 30% |

### `reevaluation`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `available` | 368 | 99 | 27% |
| `unavailable` | 310 | 93 | 30% |

### `regressionSeverity` — **the failure rate moves with this knob**

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `major` | 268 | 96 | 36% |
| `minor` | 134 | 46 | 34% |
| `none` | 192 | 50 | 26% |
| `unknown` | 84 | 0 | 0% |

### `repeatCount`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `1` | 374 | 91 | 24% |
| `2` | 304 | 101 | 33% |

### `rollbackTiming`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `after_bad_eval` | 302 | 83 | 27% |
| `none` | 376 | 109 | 29% |

### `rolloutPhase` — **the failure rate moves with this knob**

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `canary` | 156 | 58 | 37% |
| `complete` | 220 | 68 | 31% |
| `pre_canary` | 128 | 0 | 0% |
| `ramp` | 174 | 66 | 38% |

### `seed`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `11` | 344 | 96 | 28% |
| `23` | 334 | 96 | 29% |

### `surface`

| value | scenarios | failed | rate |
|---|---:|---:|---:|
| `ci_worker` | 192 | 54 | 28% |
| `release_console` | 286 | 77 | 27% |
| `routing_service` | 200 | 61 | 31% |

**4 knob(s) move the failure rate: `canaryWindow`, `evalMix`, `regressionSeverity`, `rolloutPhase`.**

## Model coverage

Counted trials span 2 model families: anthropic, openai.

## Against the pre-registration

**Kill signal was:** A counted Claude/Anthropic smoke trial passes every graded deployment-alias scenario cleanly under the current challenge hash. That creates a provider-delta finding: OpenAI failed on target, Claude solved the same public task, and production /6 matrix spend remains blocked pending diagnosis or evolution.

**Confirm signal was:** A counted Claude/Anthropic smoke trial fails on an intended deployment-alias mechanism under the current challenge hash, with transcript, submission, verifier output and scenario-set id preserved. Together with the counted OpenAI failure, this would create early cross-lab smoke difficulty evidence, not an automatic full /6 run.

**The evidence is mixed across provider families.** One counted subject failed and one solved, so the family diagnosis must decide whether this is shared difficulty, provider delta, or an evolution signal.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
