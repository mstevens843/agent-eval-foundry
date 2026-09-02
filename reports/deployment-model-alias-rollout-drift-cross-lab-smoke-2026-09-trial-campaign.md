# Trial campaign — deployment-model-alias-rollout-drift

`deployment-model-alias-rollout-drift-cross-lab-smoke-2026-09` · 1 slots · 1 run · 0 counted · 0 not run

## Pre-registration

Written before any slot ran, so the result below cannot be reinterpreted into a success.

**Hypothesis.** The OpenAI/Codex smoke failure may reflect a deployment-alias mechanism rather than one provider's implementation habit. Exactly one non-OpenAI smoke under the same challenge hash is used to test that boundary. This is not a full /6 matrix and it must not be interpreted as cross-lab difficulty unless the non-OpenAI run also fails on an intended deployment-alias check.

**Kill signal.** A counted Claude/Anthropic smoke trial passes every graded deployment-alias scenario cleanly under the current challenge hash. That creates a provider-delta finding: OpenAI failed on target, Claude solved the same public task, and production /6 matrix spend remains blocked pending diagnosis or evolution.

**Confirm signal.** A counted Claude/Anthropic smoke trial fails on an intended deployment-alias mechanism under the current challenge hash, with transcript, submission, verifier output and scenario-set id preserved. Together with the counted OpenAI failure, this would create early cross-lab smoke difficulty evidence, not an automatic full /6 run.

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
| budget | $8.00 |

## Slots

| slot | model | runner | state | run |
|---|---|---|---|---|
| A1 | `anthropic/claude-opus-5` | external | IMPORTED, **WITHDRAWN** | `deployment-alias-2026-09-claude-1` — **superseded** by the 2026-09-01 `deployment-model-alias-rollout-drift` challenge migration; it does not count and its numbers are withdrawn |

**Withdrawn evidence.** `deployment-alias-2026-09-claude-1` was invalidated by the 2026-09-01 `deployment-model-alias-rollout-drift` challenge migration: it was graded against a package this repository no longer produces, so that row does not count and every number on it is withdrawn. The trial record's own `counts` field is about grading and says nothing about whether the task still exists, which is exactly how an invalidated run was once presented as live evidence. Read this row as spend that was made, not as a result about the family as it stands.

A slot whose recorded run has been withdrawn is an unfilled slot, not a finished one. The
header line counts it under `run` and not under `counted`, and only the second number says
anything about the task this campaign now describes: this campaign has no result yet, and neither its kill signal nor its confirm signal has been tested.

## Counting rules

Declared in the plan and cross-checked against the code — a plan may not redefine what counts.

| | |
|---|---|
| never counts | `refused`, `timeout`, `infrastructure_error` |
| on refusal | Recorded as REFUSED with transcript preserved, and never counted. Provider refusal is not a cross-lab failure and the slot is not re-run as evidence selection. |
| on infrastructure failure | Recorded as FAILED_INFRA with transcript preserved, and never counted. It may be retried only as infrastructure repair if the repository convention allows a retry. |
| on crash | Recorded as `crashed` and not counted by default. Count only after manual classification proves the crash is in the submitted artifact rather than in the harness. |
| retries after infrastructure failure | 1 |
| retry after refusal | **no** — re-running until a provider complies turns a refusal into a sampling artifact |

## What is preserved

- The returned external packet is preserved under external-intake/received/<run-id>/ whether or not it counts.
- A counted import writes trials/deployment-model-alias-rollout-drift/<run-id>/ with metadata, countability, transcript, challenge, submission and verifier output.
- metadata.json records provider family, provider, model, runtime, challenge hash, scenario-set id and contamination flags.
- transcript.txt is preserved verbatim, including refusals and infrastructure errors.
- challenge/ holds the exact package the model saw.
- submission/ holds the submitted subject.mjs artifact.
- verifier-output.json holds graded cells and named failed checks.
- countability.json records the countability decision and reason.
- A stale package hash invalidates the smoke evidence rather than letting old evidence count for a repaired package.

## Superseded trials

These ran against an earlier version of this challenge and are preserved without counting.
A trial is evidence about the task it was run against, and that task no longer exists.

- `deployment-alias-2026-09-claude-1`
- `deployment-model-alias-rollout-drift-2026-08-o1`

The plan and the trial directories on disk agree.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
