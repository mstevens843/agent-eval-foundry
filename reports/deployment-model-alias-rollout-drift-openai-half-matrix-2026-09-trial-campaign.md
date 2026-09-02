# Trial campaign — deployment-model-alias-rollout-drift

`deployment-model-alias-rollout-drift-openai-half-matrix-2026-09` · 3 slots · 1 run · 0 counted · 2 not run

## Pre-registration

Written before any slot ran, so the result below cannot be reinterpreted into a success.

**Hypothesis.** After one counted OpenAI/Codex smoke failed on target and one current-hash Claude/Anthropic smoke solved cleanly, two additional OpenAI/Codex repeats can estimate same-provider stability for deployment-alias. This is not cross-lab breadth and must not unlock a full /6 matrix while the provider-delta result remains mixed.

**Kill signal.** If the two remaining OpenAI/Codex repeats pass cleanly or fail only off-target while the existing smoke remains the only failure, route the family to repair or evolve before production spend. A provider refusal, infrastructure error, stale hash, missing transcript or missing verifier output counts nothing.

**Confirm signal.** If the two remaining OpenAI/Codex repeats also fail on intended deployment-alias checks under the current hash, the family gains same-provider stability evidence. That still is not cross-lab difficulty and still does not satisfy the full /6 matrix gate unless a non-OpenAI counted smoke also fails on target or an explicit override is recorded.

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
| challenge hash (plan) | `805efb58c923f9e081db1b41967392d7` |
| challenge hash (now) | `805efb58c923f9e081db1b41967392d7` |
| match | **yes** — every slot measured the task this repository currently holds |
| scenario set | `drift-339-590affe3`, 339 scenarios |
| isolation | `subprocess` |
| timeout | 30 minutes per slot |
| budget | $16.00 |

## Slots

| slot | model | runner | state | run |
|---|---|---|---|---|
| O1 | `openai/gpt-5.6-sol` | shell | RUN, **WITHDRAWN** | `deployment-model-alias-rollout-drift-2026-08-o1` — **superseded** by the 2026-09-01 `deployment-model-alias-rollout-drift` challenge migration; it does not count and its numbers are withdrawn |
| O2 | `openai/gpt-5.6-sol` | shell | **NOT_RUN** | — |
| O3 | `openai/gpt-5.6-sol` | shell | **NOT_RUN** | — |

**Withdrawn evidence.** `deployment-model-alias-rollout-drift-2026-08-o1` was invalidated by the 2026-09-01 `deployment-model-alias-rollout-drift` challenge migration: it was graded against a package this repository no longer produces, so that row does not count and every number on it is withdrawn. The trial record's own `counts` field is about grading and says nothing about whether the task still exists, which is exactly how an invalidated run was once presented as live evidence. Read this row as spend that was made, not as a result about the family as it stands.

A slot whose recorded run has been withdrawn is an unfilled slot, not a finished one. The
header line counts it under `run` and not under `counted`, and only the second number says
anything about the task this campaign now describes: this campaign has no result yet, and neither its kill signal nor its confirm signal has been tested.

### Why the unrun slots are unrun

- **O2** (openai/gpt-5.6-sol): Planned OpenAI/Codex repeat. Same model/provider means same-provider stability only, not a new provider lab.
- **O3** (openai/gpt-5.6-sol): Planned OpenAI/Codex repeat. Do not report this as cross-lab evidence even if it is later counted.

## Counting rules

Declared in the plan and cross-checked against the code — a plan may not redefine what counts.

| | |
|---|---|
| never counts | `refused`, `timeout`, `infrastructure_error` |
| on refusal | Recorded as REFUSED with transcript preserved, and never counted. Do not retry refusal into compliance. |
| on infrastructure failure | Recorded as FAILED_INFRA with transcript preserved, and never counted. One infrastructure repair retry may be scheduled outside evidence selection. |
| on crash | Recorded as crashed and not counted by default. Count only after manual classification proves the crash is in the submitted artifact rather than in the harness. |
| retries after infrastructure failure | 1 |
| retry after refusal | **no** — re-running until a provider complies turns a refusal into a sampling artifact |

## What is preserved

- The existing O1 smoke trial counts as slot 1 only while its challenge hash and scenario set remain current.
- O2 and O3 are planned OpenAI/Codex repeats, not a full matrix.
- O2 and O3 must not run without explicit user approval after provider-delta diagnosis is reviewed.
- Every attempt writes a durable trial directory under trials/deployment-model-alias-rollout-drift/<run-id>/ whether or not it counts.
- metadata.json records provider, command, challenge hash, scenario-set id and scenario count.
- transcript.txt is preserved verbatim, including refusals and infrastructure errors.
- challenge/ holds the exact package the model saw.
- submission/ holds the submitted subject.mjs artifact.
- verifier-output.json holds graded cells and named failed checks.
- countability.json records the countability decision and reason.

## Superseded trials

These ran against an earlier version of this challenge and are preserved without counting.
A trial is evidence about the task it was run against, and that task no longer exists.

- `deployment-alias-2026-09-claude-1`
- `deployment-model-alias-rollout-drift-2026-08-o1`

The plan and the trial directories on disk agree.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
