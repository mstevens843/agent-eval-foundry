# Browser coverage repair and Round 5 preparation

September 11, 2026. **Browser's last Codex attempt is excluded from counting because its passing grade used incomplete coverage. Route's Codex pass remains counted.** Round 5 is prepared for all five tasks, with the same providers as Round 4. This engineering work made no model calls.

## Counting disposition

| Task | Round 4 provider | Original reward | Counted reward | Round 5 provider |
| --- | --- | ---: | ---: | --- |
| Route policy | Codex | 1 | **1, retained** | Codex |
| Browser replay | Codex | 1 | **null, grading void** | Codex |
| Recurring calendar | Claude | 0 | **0, retained** | Claude |
| Workflow authority | Claude | 0 | **0, retained** | Claude |
| Delegated budget | Claude | 0 | **0, retained** | Claude |

The [disposition record](evidence/2026-09-11-browser-round-four-disposition.json) binds these decisions to the original completion and grade hashes. Browser's original reward remains 1, its diagnostic regrade is 0, and its counted reward is null. Neither the old pass nor the diagnostic failure enters the counted set. The next fresh Codex attempt fills that excluded slot. This is separate from Browser's earlier Claude process interruption, which remains unscored; its missing Claude slot is still pending.

Round 5 means the fifth campaign on the public **3.0.0** version. Its entries are **historical Trial 7** in the original documents because those histories include two earlier-version trials. It is the second opposite-provider attempt scheduled for each package, although Browser's first completed Codex attempt has now been voided. No provider switches occur this round.

## Coverage added under the existing rules

The [independent pass audit](hardened-round-four-pass-audit-2026-09-11.md) reproduced a permitted existing-dialog recovery path in real Chromium. Public semantics allow unique integer steps, and confirmation is conditional on dialog identity, operation identity, payload and session. A fresh form submission is not mandatory when a matching dialog already exists.

Three private scenarios now exercise first steps `-1`, `-2` and `0`. In the `-1` case, the application's pre-existing dialog has the requested operation identity and payload. It carries the diagnostic `stale: true` flag, but the published confirmation interface permits its confirmation when the identity and session match. The reference confirms it, reaches the required effects and reports, and handles repeated delivery correctly. The other two cases check nearby identities where a new submission is needed. These are actual executions of the unchanged application, not fabricated traces.

Only `private/scenarios.mjs` changed within the Browser task source tree. Public files, application, service authority, reference implementations and checker contract remain unchanged. The generated scenario population grew from 19 to 22. Every candidate is evaluated on all scenarios, including the new valid recovery path; diagnostic reasons remain ungraded.

The frozen Browser export uses **coverage-v3**. Route, Calendar, Workflow and Budget retain their exact **coverage-v2** exports. The campaign execution build is a verified byte-for-byte copy of Round 4's frozen runtime. Browser's export includes that runtime's existing local CLI, with no new shared execution-code changes.

## Validation and reproduction

- Reference and alternative services pass **22/22** scenarios. The valid repeated-operation variant also passes. Untouched starters fail for the expected semantic or missing-deliverable reasons.
- The reference checker correctly classifies **14/14** candidates, including all three valid implementations and every existing negative control.
- The saved Round 4 Browser service passes **22/22**. Its checker scores **12/14**, rejecting both reference and alternative on `signed-step--1` with the same unnecessary-submission requirement. Output shape is complete and verdicts are deterministic. This reproduces the defect in the integrated bank.
- Native Harbor oracle returns **1** and nop returns **0**, with no infrastructure exceptions. **Nine** verifier integrity controls pass, including isolation and forged reward/output protection.
- **22** pinned upstream static checks and **48** focused regression tests pass. Foundry recipient reproduction and native export reproduction pass.

The original Browser completion manifest was verified before and after replay: **1,389 files**, unchanged. Prior records for all five are verified during preparation. The [coverage evidence](evidence/2026-09-11-browser-coverage-v3.json) records the new Browser digest, all four retained digests, reference/checker results, native manifests, reproduction receipts and exact local evidence paths. The previous audit and original campaign records remain intact.

## Ready for the next campaign

Use the [Round 5 handoff](../../docs/hardened-next-five-trial-five-handoff.md) and [preparation manifest](evidence/2026-09-11-hardened-next-five-trial-five-preparation.json). Exactly five fresh attempts are authorized, all launched concurrently: Route and Browser on Codex; Calendar, Workflow and Budget on Claude. Browser keeps 4 GiB authoring memory and the existing bounded resource diagnostics; the other four keep 2 GiB. Every task keeps the three-hour wall budget.

No model trials were launched during this preparation. The original five finalists and their 28/30 counted reward-zero results are unchanged.
