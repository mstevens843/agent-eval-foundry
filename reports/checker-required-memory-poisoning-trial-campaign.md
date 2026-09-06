# Trial campaign — checker-required-memory-poisoning

`checker-required-2026-08` · 6 slots · 1 run · 0 counted · 5 not run

## Pre-registration

Written before any slot ran, so the result below cannot be reinterpreted into a success.

**Hypothesis.** Models often narrate verification but do not ship an executable independent checker. The checker-required memory-poisoning family should distinguish subject behavior from checker strength: a counted Codex/OpenAI run may solve the memory policy, fail to provide checker.mjs, or ship a checker that misses held-out bad traces. A stronger confirmation is a failure concentrated on checker_* checks rather than only subject_* checks.

**Kill signal.** Every counted Codex/OpenAI trial passes both artifacts cleanly under the current challenge hash, which means the available OpenAI subject already solves the required-checker variant. Alternatively, failures are caused by an ambiguous checker interface or host/package defect, which means HOLD/REPAIR rather than difficulty-evidenced.

**Confirm signal.** At least one counted Codex/OpenAI trial fails at least one checker-required scenario under the current challenge hash, with transcript, subject.mjs, checker.mjs and verifier output preserved. Repeated OpenAI runs are repeated trials only and do not create cross-lab or agent-axis breadth evidence.

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
| challenge hash (plan) | `448f2f816c51030cc97a374816226168` |
| challenge hash (now) | `0530fe3b520faaddd9ad7ed8742825cc` |
| match | **NO** — the family changed after the plan was written; these slots measured a different task |
| scenario set | `poisoning-792-67126f04`, 792 scenarios |
| isolation | `subprocess` |
| timeout | 30 minutes per slot |
| budget | $15.00 |

## Slots

| slot | model | runner | state | run |
|---|---|---|---|---|
| O1 | `openai/gpt-5.6-sol` | shell | RUN, **WITHDRAWN** | `checker-required-2026-08-o1` — **superseded** by the 2026-09-06 `checker-required-memory-poisoning` challenge migration; it does not count and its numbers are withdrawn |
| O2 | `openai/gpt-5.6-sol` | shell | **NOT_RUN** | — |
| A1 | `anthropic/claude-opus-5` | external | **NOT_RUN** | — |
| A2 | `anthropic/claude-sonnet-5` | external | **NOT_RUN** | — |
| G1 | `google/gemini-3-pro` | external | **NOT_RUN** | — |
| X1 | `external/unspecified` | external | **NOT_RUN** | — |

**Withdrawn evidence.** `checker-required-2026-08-o1` was invalidated by the 2026-09-06 `checker-required-memory-poisoning` challenge migration: it was graded against a package this repository no longer produces, so that row does not count and every number on it is withdrawn. The trial record's own `counts` field is about grading and says nothing about whether the task still exists, which is exactly how an invalidated run was once presented as live evidence. Read this row as spend that was made, not as a result about the family as it stands.

A slot whose recorded run has been withdrawn is an unfilled slot, not a finished one. The
header line counts it under `run` and not under `counted`, and only the second number says
anything about the task this campaign now describes: this campaign has no result yet, and neither its kill signal nor its confirm signal has been tested.

### Why the unrun slots are unrun

- **O2** (openai/gpt-5.6-sol): Optional repeated OpenAI trial. Counts as a repeated trial of the same subject only; it does not add a new subject, lab or cross-family breadth.
- **A1** (anthropic/claude-opus-5): Import-only in this phase. Do not execute Anthropic/Claude locally because the account is out of tokens.
- **A2** (anthropic/claude-sonnet-5): Import-only in this phase. Prepared bundle only; no Anthropic quota should be consumed.
- **G1** (google/gemini-3-pro): Import-only unless entitlement changes. Prior Gemini runs were blocked by IneligibleTierError and count as infrastructure, not model evidence.
- **X1** (external/unspecified): Generic external-subject bundle for later imported runs with transcript, metadata and both submission artifacts preserved.

## Counting rules

Declared in the plan and cross-checked against the code — a plan may not redefine what counts.

| | |
|---|---|
| never counts | `refused`, `timeout`, `infrastructure_error` |
| on refusal | Recorded as REFUSED with transcript preserved, and never counted. A provider refusal is the absence of an attempt, not a checker failure. |
| on infrastructure failure | Recorded as FAILED_INFRA, transcript preserved, uncounted. May be re-run up to the declared retry limit because the failure is in the harness or provider, not the subject. |
| on crash | Recorded as `crashed` and NOT counted by default. Promote by hand only if the crash is demonstrably inside the submitted artifact rather than in the checker harness. |
| retries after infrastructure failure | 2 |
| retry after refusal | **no** — re-running until a provider complies turns a refusal into a sampling artifact |

## What is preserved

- Every slot writes a durable trial directory under trials/<family>/<run-id>/ whether or not it counts.
- metadata.json records the provider, command, challenge hash and scenario-set id.
- transcript.txt is preserved verbatim, including refusals, entitlement failures and crashes.
- challenge/ holds the exact package the model saw.
- submission/ holds both subject.mjs and checker.mjs for counted completed runs.
- verifier-output.json holds the graded cells; countability.json holds the counting decision and its reason.
- A stale challenge hash invalidates a run rather than letting old evidence count for a repaired spec.

## Superseded trials

These ran against an earlier version of this challenge and are preserved without counting.
A trial is evidence about the task it was run against, and that task no longer exists.

- `checker-required-2026-08-o1`

The plan and the trial directories on disk agree.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
