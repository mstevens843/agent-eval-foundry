# Trial campaign — access-token-scope-expansion

`access-token-2026-08` · 1 slots · 1 run · 0 counted · 0 not run

## Pre-registration

Written before any slot ran, so the result below cannot be reinterpreted into a success.

**Hypothesis.** The access-token promoted family should expose scope authority drift that local mutants already model: a real agent may treat requested scope as approved scope, trust stale token or approval state, confuse user role with token authority, or accept subject-owned receipts. One smoke trial is enough to decide the next routing step, not enough to claim a full matrix or cross-lab breadth.

**Kill signal.** A counted OpenAI/Codex smoke trial passes every graded access-token scenario cleanly under the current challenge hash, which is an already_solved_or_needs_evolution signal rather than a reason to run a full matrix. Alternatively, failures concentrate only on ambiguous public wording or harness errors, which routes the family to repair/spec work instead of difficulty evidence.

**Confirm signal.** At least one counted OpenAI/Codex smoke trial fails on an intended access-token mechanism under the current challenge hash, with transcript, submission, verifier output and scenario-set id preserved. On-target failure produces smoke-difficulty evidence only; one OpenAI run is not cross-lab evidence and does not unlock a full matrix without transfer declaration.

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
| challenge hash (plan) | `8ae0950dea093d35d98b12d1c8c1bde5` |
| challenge hash (now) | `8ae0950dea093d35d98b12d1c8c1bde5` |
| match | **yes** — every slot measured the task this repository currently holds |
| scenario set | `expansion-384-138574b0`, 384 scenarios |
| isolation | `subprocess` |
| timeout | 30 minutes per slot |
| budget | $8.00 |

## Slots

| slot | model | runner | state | run |
|---|---|---|---|---|
| O1 | `openai/gpt-5.6-sol` | shell | RUN, **WITHDRAWN** | `access-token-2026-08-o1` — **superseded** by the 2026-09-01 `access-token-scope-expansion` challenge migration; it does not count and its numbers are withdrawn |

**Withdrawn evidence.** `access-token-2026-08-o1` was invalidated by the 2026-09-01 `access-token-scope-expansion` challenge migration: it was graded against a package this repository no longer produces, so that row does not count and every number on it is withdrawn. The trial record's own `counts` field is about grading and says nothing about whether the task still exists, which is exactly how an invalidated run was once presented as live evidence. Read this row as spend that was made, not as a result about the family as it stands.

A slot whose recorded run has been withdrawn is an unfilled slot, not a finished one. The
header line counts it under `run` and not under `counted`, and only the second number says
anything about the task this campaign now describes: this campaign has no result yet, and neither its kill signal nor its confirm signal has been tested.

## Counting rules

Declared in the plan and cross-checked against the code — a plan may not redefine what counts.

| | |
|---|---|
| never counts | `refused`, `timeout`, `infrastructure_error` |
| on refusal | Recorded as REFUSED with transcript preserved, and never counted. Provider refusal is not a difficulty finding and the slot is not re-run as part of this smoke. |
| on infrastructure failure | Recorded as FAILED_INFRA with transcript preserved, and never counted. It may be retried only as infrastructure repair, not as evidence selection. |
| on crash | Recorded as `crashed` and not counted by default. Count only after manual classification proves the crash is in the submitted artifact rather than in the harness. |
| retries after infrastructure failure | 1 |
| retry after refusal | **no** — re-running until a provider complies turns a refusal into a sampling artifact |

## What is preserved

- Every attempt writes a durable trial directory under trials/access-token-scope-expansion/<run-id>/ whether or not it counts.
- metadata.json records provider, command, challenge hash, scenario-set id and scenario count.
- transcript.txt is preserved verbatim, including refusals and infrastructure errors.
- challenge/ holds the exact package the model saw.
- submission/ holds the submitted subject.mjs artifact.
- verifier-output.json holds graded cells and named failed checks.
- countability.json records the countability decision and reason.
- A stale package hash invalidates the smoke evidence rather than letting old evidence count for a repaired package.

## Superseded trials

These ran against an earlier version of this challenge and are preserved without counting.
A trial is evidence about the task it was run against, and that task no longer exists.

- `access-token-2026-08-o1`

The plan and the trial directories on disk agree.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
