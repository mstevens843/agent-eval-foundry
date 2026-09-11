# Five corrected packages prepared for Trial 4

Completed September 11, 2026 UTC. All five packages are validated and frozen for one fresh trial each, concurrently. Public instructions, interfaces and empty starters are byte-identical to the first hardened 3.0.0 trial. This revision changes private coverage and corrects a host response that contradicted the existing contract.

The [independent audit](../hardened-next-five-pass-audit-2026-09-11.md) is now integrated as **coverage-v2**. Preparation and validation made **zero model calls**. The five previously qualified finalists and their 28/30 reward-zero results remain unchanged.

| Task | Next provider | Reference service | Reference checker |
|---|---|---|---|
| 14 — Route policy | Claude | 33/33 | 13/13 |
| 03 — Browser replay | Claude | 19/19 | 14/14 |
| 18 — Recurring calendar | Codex | 37/37 | 16/16 |
| 20 — Workflow authority | Codex | 36/36 | 16/16 |
| 04 — Delegated budget | Codex | 21/21 | 17/17 |

## Changes tied to existing obligations

- **Browser:** two negative candidates perform the correct UI work but violate the documented completion report. One omits a later completed delivery's report after an actual interrupted invocation; the other returns a wrapped report. The interruption is detected through a candidate-owned journal, without matching a scenario ID. The first control is clean in the non-interrupted calibration case.
- **Workflow:** an unknown dispatch token after a denied job now returns the required request error. An executed job only receives the idempotent PENDING response for its committed authorization token. A new positive candidate repeats dispatch after a terminal receipt; all 36 scenarios pass with one effect per executed job. A regression exercises both denied and executed terminal states, malformed objects, unknown tokens and valid retries.
- **All five checker interfaces:** private token coverage includes prototype-property names, numeric-looking strings and other opaque string keys. Both Foundry and native Harbor require one own Boolean verdict per supplied token. Token assignment follows candidate shuffling so a token does not identify a correct or broken candidate. Old packages without this opt-in keep their existing token generation.
- **Calendar and Budget:** existing controls continue to detect rejection of valid acknowledged duplicate updates and valid job associations. Their public requirements and authored solutions needed no repair.
- **Evidence publication:** the new frozen runtime includes the separate 512 MiB publication budget and lossless compressed process logs. Submission limits retain their prior scope. The original recovered Calendar and Budget records remain intact.

## Replays of the five saved submissions

All five saved services pass again against the corrected host and scenario banks. All five saved checkers fail the integrated coverage. These are provider-free replays, **not five additional model trials**. Original recorded rewards remain available alongside the audit findings.

| Task | Original Trial 3 reward | Replay finding |
|---|---|---|
| Route | 1 | Omits the own verdict for `__proto__`; all 13 ordinary-token classifications pass. |
| Browser | 1 | Accepts both broken report candidates; 12/14 with opaque and ordinary tokens. |
| Calendar | 0 | Rejects the valid reference and alternative; 14/16 under either token set. |
| Workflow | 0 | Original 15 candidates now pass with the host corrected; only the new legal dispatch-retry candidate is rejected, giving 15/16. |
| Budget | 0 | Rejects three valid candidates, giving 14/17 with ordinary tokens; also drops `__proto__` under opaque-token coverage. |

Route and Budget produce incomplete output under opaque tokens. Per-candidate observations are diagnostic in those cases; incomplete output fails the required interface. A second replay with ordinary tokens keeps semantic defects visible independently of that interface failure.

The Workflow distinction matters: its original checker rejection was triggered by a host bug. The new replay demonstrates a separate genuine checker defect after fixing that bug. Neither the original artifact nor its explanation is silently replaced. Calendar and Budget publication recovery only published existing completed evidence; neither model ran again.

## Validation and frozen artifacts

- 91 Foundry assurance checks and 76/76 reference checker classifications.
- Five native Harbor oracle reward-one results and five expected untouched-starter reward-zero results, with no infrastructure exceptions.
- 45 native integrity controls, including immutable inputs, private-data boundaries, process cleanup and forged reward/output rejection.
- 23 deliberately weakened checker variants detected on protected execution captures; five reference checkers accepted.
- 110 pinned upstream static checks and 86 focused regression tests. The final publication/contract check also passes (19 tests, including 13 repeated contract tests). Lint and typecheck pass.
- Foundry export reproduction, native export reproduction and byte-for-byte public-file preservation verified. All five original Trial 3 completion manifests were reverified after implementation.

[Machine-readable validation and replay evidence](evidence/2026-09-11-next-five-coverage-v2.json) records the exact files and hashes. The [generator continuity record](evidence/2026-09-11-next-five-generators.json) connects current scenario bytes to earlier versions, fixing the stale regression expectation without rewriting historical selection evidence.

Foundry exports: `.local/next-five-coverage-v2-2026-09-11/release/<task-id>/export`.
Native exports: `.local/next-five-coverage-v2-2026-09-11/harbor/<task-id>`.

| Task | Foundry package digest |
|---|---|
| route-policy-repair | `2145b82b5c06cafcdc3447510d1d5a02ba799d6cbea77e472eb9ae05be921acc` |
| browser-replay-repair | `712f97575821006724eef7f3b3161c97512019897af62e46ab32b9c32dcddf31` |
| recurring-calendar-repair | `e36fc1f3bd8ac60f4a6dab0683513e42693ecea397693d536198a3a10772a467` |
| workflow-authority-repair | `2a51be6fc49db809f3c59151526cd6fe97acd9c9a83216ab8842d55f390771f2` |
| delegated-budget-repair | `087aa9c0f84f0940202fd7c55ac9d042d6d689e09cc0b298e680c0d4ba00db7c` |

The [Trial 4 handoff](../../docs/hardened-next-five-trial-two-handoff.md) and [preparation manifest](evidence/2026-09-11-hardened-next-five-trial-two-preparation.json) identify the frozen controller, independently verified source/dependency bytes, pinned bundle, profiles and exports. The runtime has its own source and dependency copy, so subsequent live repository edits cannot change its execution identity.

Finite coverage is not a proof against every possible defect. This work closes the demonstrated gaps and verifies the corrected banks before new measurements. No model trials, commits or pushes were performed during preparation.
