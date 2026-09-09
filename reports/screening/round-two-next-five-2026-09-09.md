# Round-two screening: next-five successors, Trial 2

September 9, 2026. **Four scored attempts, four solver passes, zero reward-zero
successes; route policy was interrupted before capture and remains unscored.**
All five attempts launched. The four completed records remain valid despite the
later controller interruption. The user has deferred route policy's retry.

## Results

| Package | Target | Reward | Service | Checker | Authoring | Dispatch through completion |
| --- | --- | --- | --- | --- | --- | --- |
| [14 — Route policy](third-five/14-route-policy-repair.md) | Claude | Unscored | Not captured | Not graded | Incomplete | Interrupted |
| [03 — Browser replay](original-five/03-browser-replay-repair.md) | Claude | 1 | 20/20 | 10/10 | 26m 05s | 27m 08s |
| [18 — Recurring calendar](fourth-five/18-recurring-calendar-repair.md) | Codex | 1 | 31/31 | 13/13 | 12m 27s | 12m 34s |
| [20 — Workflow authority](fourth-five/20-workflow-authority-repair.md) | Codex | 1 | 30/30 | 14/14 | 12m 36s | 12m 45s |
| [04 — Delegated budget](original-five/04-delegated-budget-repair.md) | Codex | 1 | 21/21 | 10/10 | 18m 46s | 18m 59s |

These are model successes at the task, not successes at finding a reward-zero
failure. Both service and independent checker were required. Reasons were
diagnostic-only. No score depends on a rejection label.

## Execution and interruption

The frozen controller recorded five dispatches between **13:43:45.249Z and
13:43:45.479Z**, a **230ms** spread. The trial operator reported observing all five
solver containers concurrently. The campaign used three Codex Sol/xhigh and two
Claude Opus 5/max profiles, subscription-only, with no paid API fallback or automatic
retry. The per-attempt maximum was 10,800 seconds. Calendar, workflow and delegated
budget switched from their original Claude pairing to Codex; browser and route
policy retained Claude.

The operator reported that host memory pressure killed the background controller
roughly 39 minutes into the campaign and that the remaining route-policy container
had exited with status 143. The retained files directly establish the important
result boundary: four complete capture/submission/grade/completion records, and one
incomplete route-policy record. The exact OS kill cause is operator-reported; this
publication does not turn it into a semantic solver failure.

Route policy retains **1,136 events / 1,336,359 bytes** in its partial event log,
but no `capture.json`, finalized `submission/`, `grade.json`, `result.json` or
`completion.json`. Its public result is **`reward: null`**. Partial implementation
and stress-testing activity indicate work was performed, not whether the final
deliverables would have passed. Preserve the original attempt and record the
eventual retry separately. No retry was launched for this publication.

## What the retrials taught us

- **Browser replay:** the agent built a simulator and broadly tested its independent
  checker, including determinism, non-mutation and alternative correct traces. It
  solved the complete service and checker despite starter removal and the added
  interruption cases. Retain its submission as a strong correct control.
- **Recurring calendar:** a recurrence/timezone model plus trace validation solved
  both deliverables. The earlier reason-label issue is absent under diagnostic-only
  reasons. The model changed, so the shorter duration is not a controlled comparison.
- **Workflow authority:** reconstructed changing authority and historical receipts,
  tested randomized histories and checker mutations, and passed both deliverables.
  Its Trial 1 label defect and diagnostic regrade remain historical records, not
  additional new trials.
- **Delegated budget:** handled rejected requests reconsidered under later grants
  while preserving receipts for prior accepted work. Randomized checker stress
  testing accompanied the passing service and new checker deliverable.
- **Route policy:** the partial capture shows continued checker testing, but the
  interruption prevents a correctness conclusion. Retry is deferred by the user.

Empty starters and additional required work did not produce a scored failure in
the four completed attempts. For the next failure-finding trials, prioritize
packages with observed required-deliverable failures over these four solved
versions. A passing agent-written service and checker are useful controls, not a
reason to spend the failure-qualification budget on them first.

## Evidence and publication

[Sanitized evidence](evidence/2026-09-09-round-two-next-five.json) records all five
attempts, including route policy's null reward, exact package/profile identities,
separate durations, completed grades and retained-file hashes. **All 3,155 files**
listed by the four completion manifests matched their recorded sizes and hashes.
All five original analysis documents linked above contain dated Trial 2 sections;
their Trial 1 and engineering history remains intact.

Raw records remain under
`.local/round-two-next-five-2026-09-09/real-campaign-frozen/`, with route policy at
`jobs/real-provider/.incomplete/route-policy-repair-attempt-1/`. The campaign uses
the same frozen runtime as the first Trial 2 group; it was not rebuilt here.
Runtime records, failed submissions and package exports were not changed.

This documentation work made zero model calls. Requested settings are separate
from observable CLI metadata; CLI price estimates are not subscription charges.
The infrastructure interruption is excluded from scored-attempt and success totals.
