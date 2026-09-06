# Provider variance

Whether the failure mechanisms this foundry builds are properties of the TASK or of one lab's
model. A benchmark run against a single provider measures that provider.

**No family yet has counted failures from more than one model family.** 0 counted trials exist and the mechanism claims are, so far, claims about the labs that produced them.

## Provider availability on this machine

Checked by executing the binary, not assumed. A provider that is not available produces NOT_RUN
slots and a prepared bundle — never a zero.

| provider | family | available | detail |
|---|---|---|---|
| `claude` | anthropic | yes | 2.1.263 (Claude Code) |
| `claude-sonnet` | anthropic | yes | 2.1.263 (Claude Code) |
| `claude-haiku` | anthropic | yes | 2.1.263 (Claude Code) |
| `claude-fable` | anthropic | yes | 2.1.263 (Claude Code) |
| `codex` | openai | yes | codex-cli 0.153.2 |
| `gemini` | google | **no** | 0.46.0; entitlement previously blocked with IneligibleTierError, so this phase treats Gemini as import-only until a real authenticated run changes that |
| `external` | external | **no** | external by declaration: prepare a bundle and import the result |

## Per family, per provider

### `access-token-scope-expansion`

**Claim strength: no-evidence.** Nothing. No counted agent trial exists for this family.

| provider | counted | failed | refused | infra | not run | fail rate | 95% interval |
|---|---:|---:|---:|---:|---:|---:|---|

**To strengthen:**

- Run counted trials on a second model family. Currently failing: none.

### `caa-revalidation`

**Claim strength: no-evidence.** Nothing. No counted agent trial exists for this family.

| provider | counted | failed | refused | infra | not run | fail rate | 95% interval |
|---|---:|---:|---:|---:|---:|---:|---|

**To strengthen:**

- Run counted trials on a second model family. Currently failing: none.

### `checker-required-memory-poisoning`

**Claim strength: no-evidence.** Nothing. No counted agent trial exists for this family.

| provider | counted | failed | refused | infra | not run | fail rate | 95% interval |
|---|---:|---:|---:|---:|---:|---:|---|
| `anthropic` | 0 | 0 | 0 | 0 | 2 | — | — |
| `external` | 0 | 0 | 0 | 0 | 1 | — | — |
| `google` | 0 | 0 | 0 | 0 | 1 | — | — |
| `openai` | 0 | 0 | 0 | 0 | 1 | — | — |

**To strengthen:**

- Run counted trials on a second model family. Currently failing: none.
- `anthropic` has 2 declared slot(s) and no counted trial.
- `external` has 1 declared slot(s) and no counted trial.
- `google` has 1 declared slot(s) and no counted trial.
- `openai` has 1 declared slot(s) and no counted trial.

### `dao-descendant`

**Claim strength: no-evidence.** Nothing. No counted agent trial exists for this family.

| provider | counted | failed | refused | infra | not run | fail rate | 95% interval |
|---|---:|---:|---:|---:|---:|---:|---|
| `anthropic` | 0 | 0 | 0 | 0 | 1 | — | — |
| `openai` | 0 | 0 | 0 | 0 | 1 | — | — |

**To strengthen:**

- Run counted trials on a second model family. Currently failing: none.
- `anthropic` has 1 declared slot(s) and no counted trial.
- `openai` has 1 declared slot(s) and no counted trial.

### `delegated-wallet-scope-reconciliation`

**Claim strength: no-evidence.** Nothing. No counted agent trial exists for this family.

| provider | counted | failed | refused | infra | not run | fail rate | 95% interval |
|---|---:|---:|---:|---:|---:|---:|---|

**To strengthen:**

- Run counted trials on a second model family. Currently failing: none.

### `deployment-model-alias-rollout-drift`

**Claim strength: no-evidence.** Nothing. No counted agent trial exists for this family.

| provider | counted | failed | refused | infra | not run | fail rate | 95% interval |
|---|---:|---:|---:|---:|---:|---:|---|

**To strengthen:**

- Run counted trials on a second model family. Currently failing: none.

### `deployment-rollback-recompute`

**Claim strength: no-evidence.** Nothing. No counted agent trial exists for this family.

| provider | counted | failed | refused | infra | not run | fail rate | 95% interval |
|---|---:|---:|---:|---:|---:|---:|---|
| `anthropic` | 0 | 0 | 0 | 0 | 1 | — | — |
| `openai` | 0 | 0 | 0 | 0 | 1 | — | — |

**To strengthen:**

- Run counted trials on a second model family. Currently failing: none.
- `anthropic` has 1 declared slot(s) and no counted trial.
- `openai` has 1 declared slot(s) and no counted trial.

### `prompt-injection-containment`

**Claim strength: no-evidence.** Nothing. No counted agent trial exists for this family.

| provider | counted | failed | refused | infra | not run | fail rate | 95% interval |
|---|---:|---:|---:|---:|---:|---:|---|

**To strengthen:**

- Run counted trials on a second model family. Currently failing: none.

### `prompt-injection-memory-poisoning`

**Claim strength: no-evidence.** Nothing. No counted agent trial exists for this family.

| provider | counted | failed | refused | infra | not run | fail rate | 95% interval |
|---|---:|---:|---:|---:|---:|---:|---|
| `anthropic` | 0 | 0 | 0 | 0 | 3 | — | — |
| `google` | 0 | 0 | 0 | 0 | 1 | — | — |
| `openai` | 0 | 0 | 0 | 0 | 3 | — | — |

**To strengthen:**

- Run counted trials on a second model family. Currently failing: none.
- `anthropic` has 3 declared slot(s) and no counted trial.
- `google` has 1 declared slot(s) and no counted trial.
- `openai` has 3 declared slot(s) and no counted trial.

### `trading-reconciliation-recompute`

**Claim strength: no-evidence.** Nothing. No counted agent trial exists for this family.

| provider | counted | failed | refused | infra | not run | fail rate | 95% interval |
|---|---:|---:|---:|---:|---:|---:|---|
| `anthropic` | 0 | 0 | 0 | 0 | 1 | — | — |
| `openai` | 0 | 0 | 0 | 0 | 1 | — | — |

**To strengthen:**

- Run counted trials on a second model family. Currently failing: none.
- `anthropic` has 1 declared slot(s) and no counted trial.
- `openai` has 1 declared slot(s) and no counted trial.

### `ui-action-record-replay`

**Claim strength: no-evidence.** Nothing. No counted agent trial exists for this family.

| provider | counted | failed | refused | infra | not run | fail rate | 95% interval |
|---|---:|---:|---:|---:|---:|---:|---|
| `anthropic` | 0 | 0 | 0 | 0 | 1 | — | — |

**To strengthen:**

- Run counted trials on a second model family. Currently failing: none.
- `anthropic` has 1 declared slot(s) and no counted trial.

### `ui-replay-live-dom`

**Claim strength: no-evidence.** Nothing. No counted agent trial exists for this family.

| provider | counted | failed | refused | infra | not run | fail rate | 95% interval |
|---|---:|---:|---:|---:|---:|---:|---|
| `anthropic` | 0 | 0 | 0 | 0 | 2 | — | — |
| `google` | 0 | 0 | 0 | 0 | 1 | — | — |

**To strengthen:**

- Run counted trials on a second model family. Currently failing: none.
- `anthropic` has 2 declared slot(s) and no counted trial.
- `google` has 1 declared slot(s) and no counted trial.

## Refusals and infrastructure failures, in full

Neither is a model result and both are recorded rather than dropped. A provider that cannot be
run here is a fact about this machine; a provider that declines is a fact about the provider.

| family | provider | outcome | what happened |
|---|---|---|---|

## Do the providers fail the same scenarios?

_Not answerable yet: fewer than two counted runs have failed anything._

## Artifact quality

What each model actually wrote. Size is not quality, but a 40-line submission and a 300-line
one are different kinds of attempt, and whether a model built its own checks is the clearest
signal of how it approached the task.

| run | provider | lines | rule codes cited | self-verifying | evidence state | scenarios failed |
|---|---|---:|---:|---|---|---:|
| `access-token-2026-08-o1` | openai | 140 | 6/8 | no | **superseded** | 0 |
| `phase17-caa-slot-1-openai-attempt-1` | openai | 24 | 0/5 | no | **superseded** | 0 |
| `phase17-caa-slot-2-anthropic-attempt-1` | claude opus | 47 | 0/5 | no | **superseded** | 0 |
| `phase17-caa-slot-3-openai-attempt-1` | openai | 23 | 0/5 | no | **superseded** | 0 |
| `phase17-caa-slot-4-anthropic-attempt-1` | claude opus | 45 | 0/5 | no | **superseded** | 0 |
| `checker-required-2026-08-o1` | openai | 462 | 11/14 | yes | **superseded** | 614 |
| `phase14-dao-descendant-neutral-skeleton-anthropic` | anthropic | 69 | 0/5 | no | **registered-variant** | 0 |
| `phase14-dao-descendant-neutral-skeleton-openai` | openai | 22 | 0/5 | no | **registered-variant** | 0 |
| `phase14-dao-descendant-seeded-recompute-anthropic` | anthropic | 55 | 0/5 | no | **superseded** | 0 |
| `phase14-dao-descendant-seeded-recompute-openai` | openai | 24 | 0/5 | no | **superseded** | 0 |
| `delegated-wallet-2026-08-o1` | openai | 170 | 7/10 | no | **superseded** | 0 |
| `deployment-alias-2026-09-claude-1` | anthropic | 310 | 5/10 | no | **superseded** | 0 |
| `deployment-model-alias-rollout-drift-2026-08-o1` | openai | 229 | 6/10 | no | **superseded** | 192 |
| `phase14-deployment-rollback-recompute-seeded-recompute-anthropic` | anthropic | 44 | 0/5 | no | **superseded** | 0 |
| `phase14-deployment-rollback-recompute-seeded-recompute-openai` | openai | 26 | 0/5 | no | **superseded** | 0 |
| `pic-claude-1` | anthropic | 319 | 8/8 | no | **superseded** | 0 |
| `pic-claude-2` | anthropic | 232 | 8/8 | no | **superseded** | 0 |
| `pic-claude-3` | anthropic | 307 | 8/8 | no | **superseded** | 0 |
| `pic-codex-1` | openai | 267 | 8/8 | no | **superseded** | 0 |
| `pic-haiku-1` | anthropic | 164 | 8/8 | no | **superseded** | 0 |
| `pic-sonnet-1` | anthropic | 62 | 0/8 | yes | **superseded** | 0 |
| `mp-claude-1` | anthropic | 336 | 7/8 | no | **superseded** | 0 |
| `mp-claude-2` | anthropic | 324 | 7/8 | no | **superseded** | 47 |
| `mp-claude-3` | anthropic | 344 | 7/8 | no | **superseded** | 32 |
| `mp-claude-r1` | anthropic | 384 | 7/8 | no | **superseded** | 32 |
| `mp-claude-r2` | anthropic | 336 | 7/8 | no | **superseded** | 0 |
| `mp-claude-r3` | anthropic | 342 | 7/8 | no | **superseded** | 0 |
| `mp-codex-1` | openai | 254 | 7/8 | no | **superseded** | 0 |
| `mp-codex-2` | openai | 293 | 7/8 | no | **superseded** | 13 |
| `mp-codex-3` | openai | 249 | 7/8 | no | **superseded** | 32 |
| `mp-haiku-1` | anthropic | 250 | 7/8 | no | **superseded** | 32 |
| `mp-sonnet-1` | anthropic | 123 | 7/8 | no | **superseded** | 42 |
| `phase14-trading-reconciliation-recompute-seeded-recompute-anthropic` | anthropic | 60 | 0/5 | no | **superseded** | 0 |
| `phase14-trading-reconciliation-recompute-seeded-recompute-openai` | openai | 27 | 0/5 | no | **superseded** | 0 |
| `ui-claude-1` | anthropic | 523 | n/a | no | **superseded** | 46 |
| `ui-claude-2` | anthropic | 698 | n/a | no | **superseded** | 33 |
| `ui-codex-1` | openai | 361 | n/a | no | **superseded** | 90 |
| `ui-haiku-1` | anthropic | 216 | n/a | no | **superseded** | 62 |
| `ui-sonnet-1` | anthropic | 106 | n/a | no | **superseded** | 62 |
| `live-dom-2026-08-o2` | openai | 510 | 0/13 | no | **superseded** | 219 |

`n/a` means the family publishes no numbered rule codes, which is not a low score. The UI
family states its contract as invariants rather than a policy table, so there is nothing to cite.

**2 of 40 submissions built some form of self-check.** Whether that separates the passing runs from the failing ones is worth reading off the table directly; with counts this small it is an observation, not a rate.

**Confident false positives.** None yet: no counted failure came from a submission that cited most of the published rule codes. Until one does, the failures on this page are as consistent with a model not having read the spec as with the task being hard.

## What this does and does not support

| claim | supported? |
|---|---|
| the foundry can run multiple providers | **yes** — more than one CLI is runnable here and trials exist |
| refusals and infra failures are kept out of the counted set | **yes** — enforced in code, not convention |
| a mechanism transfers across labs | **not yet** — see the per-family tables |
| rates are precise | **no** — every count here is below the 5-trial threshold and the intervals show it |

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
