# Historical trials — durable approval outbox

The outbox family's real trial record, imported from the Harbor run directories that produced it
and normalized into the same `TrialRecord` shape the containment family uses. Until this import
existed the outbox side was a static matrix with no notion of who ran, what it cost, or which runs
were thrown away — so there was nothing to compare a second family against.

## What the import found

| | |
|---|---:|
| run directories parsed | 33 |
| **counted** (standard attempts, clean) | **15** |
| uncounted | 18 |
| recorded spend across all runs | $252.51 |

| run kind | counted | uncounted | spend |
|---|---:|---:|---:|
| `cheat` | 0 | 6 | $8.99 |
| `gate` | 0 | 3 | $0.00 |
| `standard` | 15 | 9 | $243.52 |

## Why so many runs do not count

This is the part worth reading. Every uncounted run below carries **reward 0.0** in the source
data, sitting in the same field as the genuine failures. Reading the reward column naively turns
each of them into a data point about difficulty. The importer classifies from `exception_stats`
and `n_errored_trials` first, and only then looks at reward.

| run | status | why it does not count |
|---|---|---|
| `cheat-claude-code` | completed | cheat run, not an attempt at the task: clean run with reward 0, no exceptions and no errored trials |
| `cheat-claude-code-cc267` | infrastructure_error | cheat run, not an attempt at the task: run errored (NonZeroAgentExitCodeError); excluded from the counted matrix |
| `cheat-claude-code-cc267b` | completed | cheat run, not an attempt at the task: clean run with reward 0, no exceptions and no errored trials |
| `cheat-codex` | refused | cheat run, not an attempt at the task: provider-level refusal (AgentSafetyRefusalError); no attempt was made, so the reward of 0 is not evidence in either direction |
| `cheat-codex-2` | refused | cheat run, not an attempt at the task: provider-level refusal (AgentSafetyRefusalError); no attempt was made, so the reward of 0 is not evidence in either direction |
| `cheat-codex-cc267` | refused | cheat run, not an attempt at the task: provider-level refusal (AgentSafetyRefusalError); no attempt was made, so the reward of 0 is not evidence in either direction |
| `check-v21` | completed | ran task "check-reorg-safe-settlement", not "durable-approval-outbox"; a reward earned on a different task is not evidence about this one however the run directory is named (clean run with reward 1, no exceptions and no errored trials) |
| `fh-codex-1` | infrastructure_error | the archived result preserves no trial ids naming a single task, so there is no evidence this run attempted "durable-approval-outbox"; the directory name is not evidence (run errored (CancelledError); excluded from the counted matrix) |
| `gate-v2-cheat-empty-ledger` | completed | gate run, not an attempt at the task: clean run with reward 1, no exceptions and no errored trials |
| `gate-v2-nop` | completed | gate run, not an attempt at the task: clean run with reward 0, no exceptions and no errored trials |
| `gate-v2-oracle` | completed | gate run, not an attempt at the task: clean run with reward 1, no exceptions and no errored trials |
| `run-claude-1` | completed | ran task "reorg-safe-settlement", not "durable-approval-outbox"; a reward earned on a different task is not evidence about this one however the run directory is named (clean run with reward 1, no exceptions and no errored trials) |
| `run-claude-2` | infrastructure_error | the archived result preserves no trial ids naming a single task, so there is no evidence this run attempted "durable-approval-outbox"; the directory name is not evidence (run errored (CancelledError); excluded from the counted matrix) |
| `v2-claude-1` | completed | ran task "reorg-safe-settlement", not "durable-approval-outbox"; a reward earned on a different task is not evidence about this one however the run directory is named (clean run with reward 1, no exceptions and no errored trials) |
| `v2-codex-2` | infrastructure_error | run errored (ApiOverloadedError); excluded from the counted matrix |
| `v2-opus-3` | timeout | hit the agent time limit (AgentTimeoutError); an infrastructure limit is not a capability finding |
| `v21-claude-1` | completed | ran task "reorg-safe-settlement", not "durable-approval-outbox"; a reward earned on a different task is not evidence about this one however the run directory is named (clean run with reward 1, no exceptions and no errored trials) |
| `v22-claude-1` | completed | ran task "reorg-safe-settlement", not "durable-approval-outbox"; a reward earned on a different task is not evidence about this one however the run directory is named (clean run with reward 1, no exceptions and no errored trials) |

Three of those are provider-level refusals on `/cheat` trials. The source repository had to state
in prose that the resulting zero meant *no attack was attempted* rather than *an attack repelled*;
here it is a classification the data carries.

`cheat` and `gate` runs are excluded from difficulty evidence by kind, not by outcome: a `/cheat`
trial measures whether the grader can be broken, and a gate run is the oracle or the nop proving
the harness works. Both produce a reward and neither is an attempt at the task.

## Counted trials

| run | subject | model | runtime | cost |
|---|---|---|---:|---:|
| `cc267-claude-1` | `claude-opus-5` | claude-opus-5 | 118m | $13.81 |
| `cc267-claude-2` | `claude-opus-5` | claude-opus-5 | 45m | $15.36 |
| `cc267-claude-3` | `claude-opus-5` | claude-opus-5 | 50m | $10.22 |
| `cc267-codex-1` | `gpt-5.6-sol` | gpt-5.6-sol | 38m | $3.49 |
| `cc267-codex-2` | `gpt-5.6-sol` | gpt-5.6-sol | 29m | $2.74 |
| `cc267-codex-3` | `gpt-5.6-sol` | gpt-5.6-sol | 32m | $3.04 |
| `fh-claude-1` | `claude-opus-5` | claude-opus-5 | 53m | $15.32 |
| `fh-claude-2` | `claude-opus-5` | claude-opus-5 | 89m | $15.99 |
| `fh-claude-3` | `claude-opus-5` | claude-opus-5 | 74m | $23.17 |
| `v2-codex-1` | `gpt-5.6-sol` | gpt-5.6-sol | 23m | $3.38 |
| `v2-codex-2b` | `gpt-5.6-sol` | gpt-5.6-sol | 25m | $3.49 |
| `v2-codex-3b` | `gpt-5.6-sol` | gpt-5.6-sol | 27m | $3.25 |
| `v2-opus-1` | `claude-opus-5` | claude-opus-5 | 78m | $21.71 |
| `v2-opus-2` | `claude-opus-5` | claude-opus-5 | 91m | $25.04 |
| `v2-opus-3b` | `claude-opus-5` | claude-opus-5 | 71m | $24.20 |

## Fidelity limits of this import

- **Rewards are binary in the source.** A counted reward-0 run is recorded as failing every
  scenario under the synthetic check `suite_reward_zero`. The per-check detail the outbox verifier
  produced was not preserved in the run summaries, so the imported cells are coarser than the
  family's own matrix. The axis analysis uses the family matrix, not these cells.
- **Effort is not recorded.** Harbor writes `adhoc` into the effort slot of its eval key, so the
  subject identity is the model alone.
- **Some archived trial-level files were redacted** before commit and do not parse; the run-level
  summaries used here are intact.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
