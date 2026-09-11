# Trial 4 on the five hardened 3.0.0 packages

Prepared September 11, 2026 UTC. Run **one fresh attempt per task, all five concurrently**: three Codex and two Claude. The user has authorized these five attempts. Preparation made no provider calls.

This is historical **Trial 4**, the second model attempt on each public 3.0.0 contract and the first fresh attempt using private grading revision **coverage-v2**. Do not confuse it with the earlier 2026-09-09 versions or with provider-free replays.

| Task | Provider | Original analysis |
|---|---|---|
| 14 — Route policy | Claude | [14-route-policy-repair.md](../reports/screening/third-five/14-route-policy-repair.md) |
| 03 — Browser replay | Claude | [03-browser-replay-repair.md](../reports/screening/original-five/03-browser-replay-repair.md) |
| 18 — Recurring calendar | Codex | [18-recurring-calendar-repair.md](../reports/screening/fourth-five/18-recurring-calendar-repair.md) |
| 20 — Workflow authority | Codex | [20-workflow-authority-repair.md](../reports/screening/fourth-five/20-workflow-authority-repair.md) |
| 04 — Delegated budget | Codex | [04-delegated-budget-repair.md](../reports/screening/original-five/04-delegated-budget-repair.md) |

Use the prepared profiles: Codex `openai/gpt-5.6-sol` at `xhigh`; Claude `anthropic/claude-opus-5` at `max`. Record observed identities separately. Each has a 10,800-second maximum, ends immediately on completion, and uses subscription billing through the existing broker. Exactly five provider calls, with no automatic retries, provider substitutions, paid API fallback or extra cheat/model calls.

## Prepared and independently verifiable

Repository: `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.

Campaign: `.local/hardened-next-five-trial-two-2026-09-11/`.
Run records: its `real-campaign-frozen/` directory.
`READY.json` is already prepared. Do not recreate it, rebuild the exports or change the controller.

The [preparation manifest](../reports/screening/evidence/2026-09-11-hardened-next-five-trial-two-preparation.json) binds the actual source, bundle, dependencies, controller, profiles and package digests. The read-only verifier recomputes those hashes; it does not merely trust a JSON statement. The controller comes from the same completed operator campaign used previously; `previous-controller.mjs`, `controller.diff`, `provenance.json` and `build.log` document its adaptation.

The runtime was copied and built in this campaign's own `frozen-source/`. It includes the fixed publication capacity, compressed logs, opaque-token grading and current protected execution. Its source digest is `b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`. Verification checked 888 source/config files and 2,088 dependency entries. No runtime import or source-identity check depends on the live repository's `src` or `dist`.

The corrected packages are under `.local/next-five-coverage-v2-2026-09-11/release/<task-id>/export`, selected by the controller's frozen `evidence.json`. The [coverage report](../reports/screening/next-five-coverage-v2-2026-09-11.md) records 91 assurance checks, 76 checker classifications, 45 integrity controls, 23 detected checker mutations, 110 static checks, five Harbor oracle/nop pairs and public-file preservation.

## Verify, launch, monitor

Use absolute paths. Use the existing login-shell Claude token and Codex credential setup. No token needs to be pasted or printed, and no new authentication setup is required. Follow normal tool permissions if a command needs approval; do not create another controller to route around a denied command.

Read the handoff and run this single provider-free verification:

```sh
node "/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/scripts/verify-hardened-next-five-trial-two.mjs"
```

Check actual Docker/memory health and confirm this campaign has no dispatch claim, attempts or active containers before dispatch. If it already started, monitor those attempts instead of dispatching duplicates. There were no active trial containers when prepared. Compare source identity to the frozen tree, not the live workspace. Do not repeat whole-batch validation; it has already completed.

Launch once through the normal tool path:

```sh
node "/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/.local/hardened-next-five-trial-two-2026-09-11/campaign.mjs" run --user-authorized-five-concurrent-v3-trial-2
```

The controller dispatches all five through `Promise.allSettled`; do not run them in sequence. Confirm all five containers started, record dispatch times, and monitor through completion. Keep partial records if infrastructure fails. Never silently retry. The 512 MiB evidence publication allowance is already in this frozen runtime, so the prior 128 MiB publication incident does not require manual setup.

## Results and publication

For every attempt, verify its completion manifest and preserve the raw output, saved service, submitted checker, service grade, checker grade, requested/observed model, timings and usage. Report service and checker scores separately. A submitted checker rejecting a contract-valid implementation or accepting an actual violation is a real task failure; it does not require the submitted service to fail too. Infrastructure interruptions are separate. Apply the existing task contract; do not invent requirements or relabel an authoring bug as a solver failure.

Append **Trial 4 — 3.0.0 / coverage-v2** to each original analysis linked above. Preserve all previous trial sections and the independent audit/replay sections. Analyze the actual saved code and failing candidate before claiming recurrence. Record why a reward-one submission passed, too.

Publish `reports/screening/hardened-next-five-trial-two-2026-09-11.md` and `reports/screening/evidence/2026-09-11-hardened-next-five-trial-two.json`. Update README, the screening index, project status and publication inventory consistently. Run `node scripts/verify-publication.mjs`, focused publication tests and `git diff --check` after those updates.

Keep original Trial 3 rewards, corrected replay results and new Trial 4 rewards distinct. In particular, the original Workflow host bug is documented; under the corrected host its old 15 candidates pass, while the new legal retry candidate exposes an independent checker defect. Calendar and Budget recovery published already-completed evidence and was not a model retry. Replays are not additional model trials, and this new five-task campaign does not alter the previous five finalists' standings.

Return the five-result table, concrete failure/pass explanations and next-step recommendations. No commits, pushes, external messages or further model trials.
