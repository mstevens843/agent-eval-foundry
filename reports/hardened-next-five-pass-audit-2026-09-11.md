# Independent audit of the five hardened 3.0.0 trial results

September 11, 2026 UTC. **Both recorded passes missed an existing checker
requirement. Calendar and Budget's recovered zeroes are verified. Workflow's
original rejection has a host-response defect, but a separate, real checker
defect also reproduces on the corrected host.** No additional model trials ran.

This audit preserves the [original campaign](screening/hardened-next-five-trial-one-2026-09-10.md)
and its recorded rewards. It adds evidence about the submitted programs and the
grader; it does not silently replace historical grades or decide replacement-slot
accounting. The five previously qualified finalists and their scores are unaffected.

| Task | Provider | Recorded reward | Independent finding |
|---|---|---|---|
| 14 — Route policy | Claude | 1 | Missing verdict for the permitted opaque token `__proto__`. Its domain checks passing did not test this output obligation. |
| 03 — Browser replay | Claude | 1 | Accepts an actual missing completion report after an interruption, and an actual wrongly wrapped report. Both violate the existing contract. |
| 18 — Recurring calendar | Codex | 0 | Verified required-checker error: requires a fresh publication for old/duplicate deliveries even when the retained generation is current and acknowledged. |
| 20 — Workflow authority | Codex | 0 | Original positive-candidate rejections disappear after correcting an invalid host response. Independently rejects a legal idempotent dispatch after terminal receipt, on both original and corrected hosts. |
| 04 — Delegated budget | Codex | 0 | Verified required-checker error: looks for nonexistent job-ID fields in raw input jobs, rejecting correct numeric job associations in actual traces. |

The [machine-readable audit](evidence/2026-09-11-hardened-next-five-pass-audit.json)
records original identities, recovery comparisons, probe hashes, observed verdicts
and audit-script hashes. Raw executions and reproducer scripts are retained under
`.local/hardened-next-five-pass-audit-2026-09-11/`.

## What “recovered” means

Calendar and Budget completed authoring and grading before the 128 MiB evidence
publication limit failed. They already had `capture.status: completed`, service
passes, failed checker grades and `reward: 0`. The separate recovery tool published
those existing bytes with a larger publication budget. It did not ask either model
to solve again and did not change the grader's verdict.

This audit independently verified **5,374 manifest-listed files across all five
records**. Every recovered file was also compared with its pre-recovery backup:
**1,399 Budget files and 982 Calendar files matched byte for byte**. The successful
publication of the evidence is therefore separate from the failed required checker.

Publication-size figures refer to aggregate evidence, not solver output limits:
Budget's pre-manifest evidence is 287,584,711 bytes (274.26 MiB); Calendar's is
177,006,489 bytes (168.81 MiB). The `-21` and `-37` directory suffixes count scenarios
per candidate, not candidate implementations. The actual candidate banks contain
17 Budget candidates and 16 Calendar candidates.

## Route: exact verdict coverage was missing

The frozen `CHECKER-INPUT.md` calls the tokens opaque and requires exactly one
verdict for every supplied token. It does not reserve JavaScript property names.

The submitted `checker.mjs` creates `const verdicts = {}` and assigns
`verdicts[token] = ...`. For `__proto__`, that assignment changes the object's
prototype rather than creating an own output property. JSON serialization omits
the verdict. This is a missing required output, not a reason-label disagreement.

The probe reused a real, correct reference execution cell, with four opaque tokens:
`normal-token`, `__proto__`, `constructor`, and `toString`. The submitted checker
returned only three verdicts on both invocations. The frozen reference checker
returned all four correctly, within its existing time/memory budget. Neither checker
mutated inputs. No factual trace was fabricated and no route semantics were changed.

This establishes a checker-interface defect. It does **not** establish a defect in
Claude's route compiler. Its finite equivalence implementation is substantially
stronger than merely testing the supplied route examples. A separate fail-open
deadline branch exists in its equivalence loop, but this audit does not count that
branch as a demonstrated failure: no natural, in-budget counterexample was reproduced.

Required coverage: run the same exact-verdict validation with ordinary and
prototype-like opaque tokens. Check own-key coverage on both invocations; maintain
positive reference/alternative coverage. No new agent-visible requirement is needed.

## Browser: two real malformed-report executions were accepted

The existing [contract](../tasks/browser-replay-repair/public/SEMANTICS.md) requires
`{traceId,steps:[{step,status:"completed"}]}` on **every completed attempt**.
The checker receives actual returned reports and completed-attempt effect snapshots.

**Missing report after interruption.** A reference-based control does all correct
browser work but returns `null` on the second delivery. In frozen scenario
`case-006`, the first delivery has a real lost-response interruption and is then
completed; the second delivery also completes. The actual reports are a correct
summary followed by `null`. The frozen service grader fails only `reports`.
The submitted checker accepts the invalid cell twice; the reference checker rejects
it twice and accepts the unchanged baseline.

The submitted checker excuses every null report whenever *any* interruption exists
in the cell. It therefore mistakes the missing report of a later completed delivery
for the absent return of a killed process. The interrupted process is not a completed
delivery and does not excuse this later missing summary.

**Wrongly wrapped report.** Another reference-based control returns
`{report: correctSummary}` instead of the required top-level summary. Real executions
of `case-000` and `case-006` again fail only `reports`. The submitted checker's
`toReport()` helper unwraps this malformed candidate output and accepts it twice.
The reference checker rejects it and accepts the baseline. The actual checker input
contract describes `reports` as returned summaries; it does not authorize this wrapper.

Required coverage: add both actual control executions to the candidate bank. The
existing service grader already catches them; its rule does not need tightening.
These are independent omissions in checker coverage, not new report obligations.

## Workflow: distinguish the host bug from the checker bug

The original two rejected positive candidates were `alternative` and
`variant-replacement-and-retry`; the submitted checker accepted `reference`.
Their failure in `case-027` followed a denied job and a lost admission response.
On restart, the correct alternative deliberately retried an invalid dispatch:

```json
{"authorizationId":"missing","revision":-1}
```

The host returned `{"status":"PENDING"}` although there was no effect and no such
authorization. The [existing public contract](../tasks/workflow-authority-repair/public/SEMANTICS.md)
says unknown tokens return `{"error":"request"}` and describes PENDING as committed
external work. The authority's `dispatch` implementation returned PENDING for any
prior decision before checking the token, including denied decisions. The checker
was justified in rejecting this impossible commitment observation.

A minimal **audit-only** host correction checks that the prior decision was executed
and its authorization matches before returning the idempotent PENDING response.
It does not change task requirements. Both correct alternatives were then executed
again in the frozen sandbox with this isolated correction. Replacing only their
two affected cells with the newly captured facts makes the saved checker classify
the original bank **15/15**, deterministically. Consequently the original 13/15
result cannot be described as a clean rejection of fully contract-valid host traces.

**Independent real checker defect.** A different complete reference variant repeats
the same dispatch after receiving its executed terminal receipt, then finishes
normally. The public contract explicitly permits repeated dispatch without an
additional effect. The service passes; there is still exactly one effect per
executed job. The submitted checker treats the repeat as a new commitment,
reports `commits a terminal job`, and regresses its reconstructed phase, causing
further spurious delivery errors. The reference checker accepts the execution.

This separate defect reproduces twice per checker on both the original host and
the isolated corrected host. It therefore remains a real required-checker defect
after removing the original grading artifact. The two causes must be recorded
separately rather than using the new counterexample to rewrite what originally happened.

Required changes before further trials: integrate the host correction, test unknown
tokens after denial and commitment, and add the valid post-receipt retry candidate.
Revalidate the submitted service, all positive alternatives and the full checker bank
against that integrated version. The audit did not modify the frozen export or
silently add this probe to the original scored bank.

## Calendar and Budget: original checker failures reproduced

For both tasks, the saved correct reference trace was passed to the actual submitted
checker and frozen reference checker in separate offline containers. The submitted
checker rejected it twice; the reference checker accepted it twice. Inputs remained
unchanged. These confirmations made no provider calls.

Calendar's reasons are `delivery old: no successful publication` and
`delivery duplicate: no successful publication`. The source is unchanged and the
existing consistent generation is acknowledged. Old/duplicate updates have no effect
and still require acknowledgement; the task does not require manufacturing a fresh
generation to acknowledge an already current state.

Budget's helper `jobId(job)` returns `job?.job ?? job?.id`, but the raw input job
objects contain grants, requests and race updates, not either of those properties.
Actual mutations, prefixes and reports consistently associate jobs by their numeric
position, beginning with `0`. The checker compares those real associations with
`undefined` and rejects correct evidence. Its service successfully used the supplied
job value. The required checker must handle the actual input facts rather than
invent an ID field for the raw job objects.

## Next step and limits

Keep the original rewards and publication recovery records. Integrate the demonstrated
Browser controls, Route output-key probe and Workflow host correction/positive retry
control before the next frozen campaign. The existing Calendar and Budget rejections
remain verified; no new defect needs to be invented to explain their zeroes.

All five saved checkers now have a reproduced contract defect, but these are targeted
audit results, **not five new model trials or five newly qualified task packages**.
Formal regrade/void/replacement accounting is not changed here. The original Workflow
grade's explanation needs correction regardless of the independently discovered defect.
The three existing 6/6 finalists and two 5/6 finalists remain unchanged.

No live runtime, shared source, task package, frozen export or original evidence was
edited during this audit. Only separate audit artifacts and documentation were written,
so the other operator's runtime rebuild and regression checks were not invalidated by
this work. The checks establish these specific omissions; they are not an exhaustive
proof that no further service, checker or isolation issues exist.
