# Trial campaign — ui-action-record-replay

`ui-2026-08` · 4 slots · 3 run · 0 counted · 1 not run

## Pre-registration

Written before any slot ran, so the result below cannot be reinterpreted into a success.

**Hypothesis.** A model can discover a UI workflow; the capability worth shipping is a recording that replays deterministically without the model in the loop. If the family measures that distinction, counted trials should fail on `no_model_in_loop`, `replay_idempotent` or `unreplayable_reported` rather than on the mechanics of clicking.

**Kill signal.** Every counted trial passes every graded scenario, which means the replay contract is obvious to a capable model and the family measures nothing. Alternatively, every counted trial fails `replay_completes` on the async-pending scenarios only, which would mean the family is measuring a harness convention rather than a capability.

**Confirm signal.** At least one counted trial fails at least one scenario, with failures spread across more than one check — in particular `replay_idempotent` at replayCount 2, or `no_model_in_loop`, which no amount of care about clicking prevents.

### Kill signal, evaluated

| | |
|---|---|
| verdict | **not evaluable** — no counted trial belongs to this campaign's slots |
| counted trials in this campaign's slots | 0 |
| passed everything | 0 |
| failed something | 0 |
| root-caused `capability` | 0 |

no counted trial belongs to this campaign's slots; the pre-registration stands and neither signal has fired

Only the mechanical clauses are evaluated: whether every counted trial passed, and whether any
counted failure has been root-caused to `capability`. Whatever else the prose above says — that
failures concentrated on ambiguous wording, that a knob pattern was or was not present — is a
judgement no code here makes, and it is printed rather than scored.

## The task that was run

| | |
|---|---|
| challenge hash (plan) | `1050e79f4804a96a5327d50dd81765b0` |
| challenge hash (now) | `9b00f533f3fd08718ddb96394f92fa48` |
| match | **NO** — the family changed after the plan was written; these slots measured a different task |
| scenario set | `replay-324-2255de40`, 324 scenarios |
| isolation | `subprocess` |
| timeout | 25 minutes per slot |
| budget | $10.00 |

## Slots

| slot | model | runner | state | run |
|---|---|---|---|---|
| A1 | `anthropic/claude-opus-5` | shell | RUN, **WITHDRAWN** | `ui-claude-1` — **superseded** by the 2026-09-06 `ui-action-record-replay` challenge migration; it does not count and its numbers are withdrawn |
| A2 | `anthropic/claude-opus-5` | shell | RUN, **WITHDRAWN** | `ui-claude-2` — **superseded** by the 2026-09-06 `ui-action-record-replay` challenge migration; it does not count and its numbers are withdrawn |
| A3 | `anthropic/claude-opus-5` | shell | **NOT_RUN** | — |
| B1 | `openai/gpt-5.6-sol` | shell | RUN, **WITHDRAWN** | `ui-codex-1` — **superseded** by the 2026-09-06 `ui-action-record-replay` challenge migration; it does not count and its numbers are withdrawn |

**Withdrawn evidence.** `ui-claude-1`, `ui-claude-2`, `ui-codex-1` were invalidated by the 2026-09-06 `ui-action-record-replay` challenge migration: they were graded against a package this repository no longer produces, so those rows do not count and every number on them is withdrawn. The trial record's own `counts` field is about grading and says nothing about whether the task still exists, which is exactly how an invalidated run was once presented as live evidence. Read these rows as spend that was made, not as a result about the family as it stands.

A slot whose recorded run has been withdrawn is an unfilled slot, not a finished one. The
header line counts it under `run` and not under `counted`, and only the second number says
anything about the task this campaign now describes: this campaign has no result yet, and neither its kill signal nor its confirm signal has been tested.

### Why the unrun slots are unrun

- **A3** (anthropic/claude-opus-5): As A1.

## Counting rules

Declared in the plan and cross-checked against the code — a plan may not redefine what counts.

| | |
|---|---|
| never counts | `refused`, `timeout`, `infrastructure_error` |
| on refusal | Recorded as REFUSED with the transcript preserved, and never counted. A provider refusal is the absence of an attempt: the reward of 0 it produces is not evidence in either direction. The slot is NOT re-run. |
| on infrastructure failure | Recorded as FAILED_INFRA, transcript preserved, uncounted. May be re-run up to the declared retry limit because the failure is in the harness rather than in the subject. |
| on crash | Recorded as `crashed` and NOT counted by default. Promoting a crash to a failure automatically would let a harness bug read as a capability finding; re-classify by hand only if the crash is demonstrably inside the submitted artifact. |
| retries after infrastructure failure | 2 |
| retry after refusal | **no** — re-running until a provider complies turns a refusal into a sampling artifact |

## What is preserved

- Every slot writes a durable trial directory under trials/<family>/<run-id>/ whether or not it counts.
- metadata.json records the provider, the command, the challenge hash and the scenario-set id.
- transcript.txt is preserved verbatim, including for refusals and crashes.
- challenge/ holds the exact bundle the model saw; submission/ holds the artifact it produced.
- verifier-output.json holds the graded cells; countability.json holds the counting decision and its reason.

## Superseded trials

These ran against an earlier version of this challenge and are preserved without counting.
A trial is evidence about the task it was run against, and that task no longer exists.

- `ui-claude-1`
- `ui-claude-2`
- `ui-codex-1`
- `ui-haiku-1`
- `ui-sonnet-1`

The plan and the trial directories on disk agree.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
