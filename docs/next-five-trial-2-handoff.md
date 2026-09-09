# Trial 2 handoff: 14 / 03 / 18 / 20 / 04

Prepared September 9, 2026. **Ready for five concurrent exploratory model attempts.**
Preparation made zero provider calls and created no dispatch claim or reservations.
The user hands this document to the existing Claude trial operator to launch the
campaign. The engineering agent has not launched it.

Repository root: `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.

## Assignments

| Package | Target | Append Trial 2 here |
|---|---|---|
| 14 — route-policy-repair | Claude | `reports/screening/third-five/14-route-policy-repair.md` |
| 03 — browser-replay-repair | Claude | `reports/screening/original-five/03-browser-replay-repair.md` |
| 18 — recurring-calendar-repair | Codex | `reports/screening/fourth-five/18-recurring-calendar-repair.md` |
| 20 — workflow-authority-repair | Codex | `reports/screening/fourth-five/20-workflow-authority-repair.md` |
| 04 — delegated-budget-repair | Codex | `reports/screening/original-five/04-delegated-budget-repair.md` |

Codex requests `openai/gpt-5.6-sol`, effort `xhigh`; Claude requests
`anthropic/claude-opus-5`, effort `max`. Exactly one fresh attempt per package:
five concurrent attempts, three Codex and two Claude, subscription-only billing,
no paid API fallback, no automatic retries or model substitutions. Each attempt
has a **10,800-second maximum**; finish normally as soon as the agent completes.
A fresh campaign's internal `attempt-1` is the package's historical **Trial 2**.

## What is already prepared

- Controller: `.local/round-two-next-five-2026-09-09/campaign.mjs`.
- Readiness: `.local/round-two-next-five-2026-09-09/real-campaign-frozen/READY.json`.
- Controller changes: `.local/round-two-next-five-2026-09-09/controller.diff`.
- Adaptation record: `.local/round-two-next-five-2026-09-09/adaptation.json`.
- Foundry exports: `.local/next-five-implementation-2026-09-09/release-ready/<id>/export`.
- Authoring evidence: `reports/screening/evidence/2026-09-09-next-five-implementation.json`.
- Implementation report: `reports/screening/next-five-implementation-plan-2026-09-09.md`.

`prepare` has already passed for all five packages with no eligibility blockers.
The controller maps the new evidence layout (`results[].analysis`,
`results[].foundry.digest`, `results[].native.digest`) into the existing plan
format. Do not run `prepare` again or overwrite `READY.json`.

This controller is a small adaptation of the one you successfully executed:
`.local/round-two-top-five-2026-09-09/campaign.mjs`. The diff changes campaign
paths, task/model/document assignments, evidence-field mapping and the recorded
authorization scope. Reservation, credential staging, concurrent execution,
grading and result capture retain that controller's implementation.

It imports **the same frozen runtime you built and used for the completed first
campaign**: `.local/round-two-top-five-2026-09-09/frozen-source/dist/index.js`.
No new runtime or executor directory was built for this handoff. It binds source
identity to that frozen directory, while loading the new immutable package exports
from the paths above. Review the small diff against your original controller;
the original campaign and runtime remain unchanged.

Verified runtime source digest:
`2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4`.
Verified runtime `dist/index.js` SHA-256:
`60695de963e5085dfe8ee4fb09353b1db0169219d9ad9425ac2a997a73b69b26`.
The runtime successfully loaded and rehashed all ten successor packages.

Use the already configured login-shell subscription credentials and existing Codex
credential staging. The controller obtains Claude's token from
`CLAUDE_CODE_OAUTH_TOKEN`; it does not need a token pasted into the prompt or stored
in the campaign. Never print credentials.

## Launch

After reviewing the adaptation, run this command once from any working directory:

```sh
node "/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/.local/round-two-next-five-2026-09-09/campaign.mjs" run --user-authorized-five-concurrent-trial-2
```

Keep the controller running through completion using your normal long-running job
mechanism. Its launch path rechecks export bytes, source/controller/evidence hashes,
auth availability and Docker resources before creating the exclusive dispatch claim.
If a dispatch claim or running campaign already exists, inspect and monitor it
instead of creating duplicate attempts. Run one five-attempt campaign at a time on
this host; if the other prepared group is active, wait for its completion and grading.

All five jobs must be launched together. Confirm actual concurrent solver containers
and record their launch times; report launch promptly, then monitor to completion.
The three-hour value is a ceiling, not a waiting period after a solver finishes.

Retain the Foundry execution path encoded in the profiles. Native Harbor oracle/nop
checks are complete author-side validation; do not switch these model attempts to
the Foundry adapter's legacy `native` flag or launch further local qualification runs.
Package exports, frozen runtime, profiles and preparation evidence stay fixed for the
campaign. Analysis files and new result summaries can be written after capture.

## Analyze and publish

Append a dated **Trial 2** section to each original analysis document in the table.
Preserve Trial 1 and engineering history. For each attempt record:

- Exact package/profile digests; requested and observed model/effort where available;
  authoring and total elapsed time, without mixing those two measures.
- Overall reward, service scenario results and checker classifications separately.
- The agent's completion claim, self-testing, failed scenario/control IDs, and the
  concrete submitted-code behavior that explains each failure.
- Changes from Trial 1, what the optimization achieved, and the next useful action.
- Infrastructure errors or capture gaps separately from task failures, if any.

Both service and independent checker are required deliverables. A substantive
checker error can make a valid reward-zero success even when the service passes.
Reasons are diagnostic-only. Apply the assignment and TB rubric: expert inference,
implied consequences and hidden tests are allowed. Any contract/grader defect claim
must identify the actual conflicting requirement and evidence; avoid adding a rule
that every tested consequence must be spelled out. Report all recorded zero rewards
clearly and assess their concrete causes without treating local checks as model trials.

Write the campaign summary to
`reports/screening/round-two-next-five-2026-09-09.md` and sanitized evidence to
`reports/screening/evidence/2026-09-09-round-two-next-five.json`.
Retain full raw evidence under `.local/round-two-next-five-2026-09-09/real-campaign-frozen/`.
Update the screening index and repository status links while preserving historical
Trial 1 tables. Add the new reports to the explicit publication inventory in
`scripts/verify-publication.mjs` where required, then run the existing publication
checks. Do not rewrite the implementation evidence used by the frozen readiness
record. Finish with the five-result table, success count with evidence, and next
recommended candidates. Do not launch retries, cheat trials or qualification campaigns.

Browser replay and delegated budget gain a required checker in this successor;
Trial 1 required only the service. Calendar, workflow and budget switch from Claude
to Codex. Record these changes when comparing trial durations and outcomes. The
deferred native work is complete: all six browser integrity controls passed, all
five native oracles earned 1 and all five nops earned 0, with no infrastructure
exceptions. Export digests were unchanged.
