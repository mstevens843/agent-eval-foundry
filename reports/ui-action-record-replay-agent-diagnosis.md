# Failure diagnosis — ui-action-record-replay

One diagnosis per counted trial that failed something, and the question each asks first: is this
a capability finding, or is the family wrong?

**Pre-registered hypothesis.** A model can discover a UI workflow; the capability worth shipping is a recording that replays deterministically without the model in the loop. If the family measures that distinction, counted trials should fail on `no_model_in_loop`, `replay_idempotent` or `unreplayable_reported` rather than on the mechanics of clicking.

## How the two readings are told apart

| reading | signature | what to do |
|---|---|---|
| `capability` | failures confined to some knob values | a difficulty finding; report it |
| `likely-spec-defect` | one check, nearly every scenario, evenly spread | read the spec for that check before reading the model |
| `mixed` | several checks, no concentration | read the transcript; do not quote either way |

Neither test is conclusive. The point is that a uniform single-check wipeout is never presented as
difficulty without the alternative reading beside it — which is the mistake the M3/M5 ambiguity
would have caused had nobody looked.

## Diagnoses

### `ui-claude-1` — anthropic/claude-opus-5

**Reading: capability** (concentrated on some knob values — the shape of a real capability gap). Matches the pre-registered hypothesis: **yes**.

46 of 324 scenarios failed.

| check | scenarios | share of failures |
|---|---:|---:|
| `no_forbidden_effect` | 33 | 72% |
| `replay_idempotent` | 28 | 61% |

**Knob values implicated** — failure rate within each value:

| knob | value | scenarios | failed | rate |
|---|---|---:|---:|---:|
| `confirmation` | `suppressed` | 107 | 33 | 31% |
| `asyncSettled` | `true` | 156 | 46 | 29% |
| `mutation` | `node_reordered` | 54 | 13 | 24% |
| `mutation` | `text_changed` | 54 | 13 | 24% |
| `mutation` | `none` | 54 | 11 | 20% |
| `replayCount` | `2` | 157 | 28 | 18% |
| `seed` | `11` | 113 | 20 | 18% |
| `mutation` | `node_wrapped` | 54 | 9 | 17% |
| `mutationDepth` | `0` | 108 | 17 | 16% |
| `mutationDepth` | `4` | 108 | 16 | 15% |
| `seed` | `23` | 104 | 13 | 13% |
| `confirmation` | `present` | 106 | 13 | 12% |

> Failures are confined to specific knob values and land on checks the pre-registered hypothesis named. This is the pattern that supports a difficulty claim.

### `ui-claude-2` — anthropic/claude-opus-5

**Reading: capability** (concentrated on some knob values — the shape of a real capability gap). Matches the pre-registered hypothesis: **yes**.

33 of 324 scenarios failed.

| check | scenarios | share of failures |
|---|---:|---:|
| `no_forbidden_effect` | 33 | 100% |

**Knob values implicated** — failure rate within each value:

| knob | value | scenarios | failed | rate |
|---|---|---:|---:|---:|
| `confirmation` | `suppressed` | 107 | 33 | 31% |
| `asyncSettled` | `true` | 156 | 33 | 21% |
| `mutation` | `text_changed` | 54 | 10 | 19% |
| `mutation` | `node_reordered` | 54 | 8 | 15% |
| `mutation` | `none` | 54 | 8 | 15% |
| `seed` | `11` | 113 | 15 | 13% |
| `mutation` | `node_wrapped` | 54 | 7 | 13% |
| `mutationDepth` | `0` | 108 | 13 | 12% |
| `replayCount` | `1` | 167 | 18 | 11% |
| `mutationDepth` | `4` | 108 | 11 | 10% |
| `replayCount` | `2` | 157 | 15 | 10% |
| `seed` | `41` | 107 | 10 | 9% |

> Failures are confined to specific knob values and land on checks the pre-registered hypothesis named. This is the pattern that supports a difficulty claim.

### `ui-codex-1` — openai/gpt-5.6-sol

**Reading: mixed** (neither concentrated nor uniform; unresolved without reading the transcript). Matches the pre-registered hypothesis: **yes**.

90 of 324 scenarios failed.

| check | scenarios | share of failures |
|---|---:|---:|
| `no_forbidden_effect` | 61 | 68% |
| `unreplayable_reported` | 44 | 49% |
| `replay_idempotent` | 35 | 39% |

**Knob values implicated** — failure rate within each value:

| knob | value | scenarios | failed | rate |
|---|---|---:|---:|---:|
| `mutation` | `attribute_renamed` | 54 | 36 | 67% |
| `confirmation` | `suppressed` | 107 | 49 | 46% |
| `asyncSettled` | `true` | 156 | 63 | 40% |
| `mutationDepth` | `4` | 108 | 42 | 39% |
| `seed` | `11` | 113 | 35 | 31% |
| `replayCount` | `2` | 157 | 47 | 30% |
| `mutationDepth` | `2` | 108 | 31 | 29% |
| `seed` | `41` | 107 | 28 | 26% |
| `seed` | `23` | 104 | 27 | 26% |
| `replayCount` | `1` | 167 | 43 | 26% |
| `mutation` | `node_reordered` | 54 | 13 | 24% |
| `mutation` | `text_changed` | 54 | 13 | 24% |

> Failures span several checks and are not confined to particular knob values. Neither reading is clean; the trial needs a human to look at the transcript before it is quoted either way.

### `ui-haiku-1` — anthropic/claude-haiku-4-5

**Reading: mixed** (neither concentrated nor uniform; unresolved without reading the transcript). Matches the pre-registered hypothesis: **yes**.

62 of 324 scenarios failed.

| check | scenarios | share of failures |
|---|---:|---:|
| `no_forbidden_effect` | 33 | 53% |
| `replay_idempotent` | 28 | 45% |
| `unreplayable_reported` | 16 | 26% |

**Knob values implicated** — failure rate within each value:

| knob | value | scenarios | failed | rate |
|---|---|---:|---:|---:|
| `confirmation` | `suppressed` | 107 | 39 | 36% |
| `mutationDepth` | `4` | 108 | 32 | 30% |
| `asyncSettled` | `true` | 156 | 46 | 29% |
| `mutation` | `node_reordered` | 54 | 13 | 24% |
| `mutation` | `text_changed` | 54 | 13 | 24% |
| `seed` | `11` | 113 | 26 | 23% |
| `replayCount` | `2` | 157 | 35 | 22% |
| `mutation` | `none` | 54 | 11 | 20% |
| `seed` | `23` | 104 | 19 | 18% |
| `confirmation` | `present` | 106 | 18 | 17% |
| `mutation` | `node_wrapped` | 54 | 9 | 17% |
| `replayCount` | `1` | 167 | 27 | 16% |

> Failures span several checks and are not confined to particular knob values. Neither reading is clean; the trial needs a human to look at the transcript before it is quoted either way.

### `ui-sonnet-1` — anthropic/claude-sonnet-5

**Reading: mixed** (neither concentrated nor uniform; unresolved without reading the transcript). Matches the pre-registered hypothesis: **yes**.

62 of 324 scenarios failed.

| check | scenarios | share of failures |
|---|---:|---:|
| `no_forbidden_effect` | 33 | 53% |
| `replay_idempotent` | 28 | 45% |
| `unreplayable_reported` | 16 | 26% |

**Knob values implicated** — failure rate within each value:

| knob | value | scenarios | failed | rate |
|---|---|---:|---:|---:|
| `confirmation` | `suppressed` | 107 | 39 | 36% |
| `mutationDepth` | `4` | 108 | 32 | 30% |
| `asyncSettled` | `true` | 156 | 46 | 29% |
| `mutation` | `node_reordered` | 54 | 13 | 24% |
| `mutation` | `text_changed` | 54 | 13 | 24% |
| `seed` | `11` | 113 | 26 | 23% |
| `replayCount` | `2` | 157 | 35 | 22% |
| `mutation` | `none` | 54 | 11 | 20% |
| `seed` | `23` | 104 | 19 | 18% |
| `confirmation` | `present` | 106 | 18 | 17% |
| `mutation` | `node_wrapped` | 54 | 9 | 17% |
| `replayCount` | `1` | 167 | 27 | 16% |

> Failures span several checks and are not confined to particular knob values. Neither reading is clean; the trial needs a human to look at the transcript before it is quoted either way.


No trial shows the signature of a spec defect.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
