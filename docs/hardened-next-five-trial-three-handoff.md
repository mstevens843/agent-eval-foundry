# Third 3.0.0 attempt: historical Trial 5

Prepared September 11, 2026 UTC. **Five fresh attempts, one per task, all five concurrently. Same providers, package bytes, grading and runtime as completed Trial 4.** Preparation made zero provider calls. The user authorized these five attempts; this handoff is for execution by the trial operator.

## Numbering and providers

| Completed or upcoming campaign | Analysis-doc label | Attempt on public 3.0.0 |
|---|---|---|
| First hardened campaign | Trial 3 | First |
| Completed coverage-v2 campaign | Trial 4 | Second |
| This prepared campaign | **Trial 5** | **Third** |

Trials 1 and 2 used earlier task versions. Saved-submission replays are not extra model attempts. Trial 3's grading corrections remain documented separately. This run is byte-identical to Trial 4, including coverage-v2; no task, checker, host, grading or runtime changes are being introduced.

Keep these providers for all five attempts:

| Task | Provider | Original analysis |
|---|---|---|
| 14 — Route policy | Claude | [14-route-policy-repair.md](../reports/screening/third-five/14-route-policy-repair.md) |
| 03 — Browser replay | Claude | [03-browser-replay-repair.md](../reports/screening/original-five/03-browser-replay-repair.md) |
| 18 — Recurring calendar | Codex | [18-recurring-calendar-repair.md](../reports/screening/fourth-five/18-recurring-calendar-repair.md) |
| 20 — Workflow authority | Codex | [20-workflow-authority-repair.md](../reports/screening/fourth-five/20-workflow-authority-repair.md) |
| 04 — Delegated budget | Codex | [04-delegated-budget-repair.md](../reports/screening/original-five/04-delegated-budget-repair.md) |

Codex uses the prepared `openai/gpt-5.6-sol` / `xhigh` profile; Claude uses `anthropic/claude-opus-5` / `max`. CLI versions, images and profile digests are identical to Trial 4. Capture observed model identity separately from the requested identity.

Each attempt has a 10,800-second maximum and finishes immediately when the solver completes. Subscription-only billing with the existing broker; no paid API fallback, model/provider substitution, automatic retry, or extra cheat/model call. Exactly five authorized calls, all together.

**Do not switch providers during this campaign.** It completes the first three model attempts on each public 3.0.0 task. An opposite-provider block would come afterward under a separate handoff; this campaign stops after these five results regardless of passes or failures.

## Prepared artifacts and verification

Repository: `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.

Campaign: `.local/hardened-next-five-trial-three-2026-09-11/`.
Execution records: its `real-campaign-frozen/` subdirectory.
The new `READY.json` exists; the new campaign has no dispatch claim or attempts. The completed predecessor campaign retains its own dispatch claim and records, which are expected and must not be removed.

The [preparation manifest](../reports/screening/evidence/2026-09-11-hardened-next-five-trial-three-preparation.json) binds all five packages and profiles, controller, readiness, source, dependencies and full runtime-copy inventory. The runtime was copied from the **same completed Trial 4 campaign you ran** into this campaign's own `frozen-source/`. No source rebuild or dependency installation occurred. `previous-controller.mjs`, `controller.diff` and `provenance.json` identify the narrow metadata/record changes. Nothing imports the live repository's `dist` or checks launch identity against its mutable source tree.

Frozen runtime identity: `b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`.
Pinned bundle: `04cd21bb17982ed40cdbd2adbb8bbd75becd4963c769ca91ba22d08c84253d81`.
Verification hashes the actual files: 888 source/config files, 2,088 dependency entries and the complete copied runtime tree. All five previous completion manifests were verified again. Native/oracle/integrity validation from [coverage-v2](../reports/screening/next-five-coverage-v2-2026-09-11.md) remains applicable because the package and grading bytes are unchanged.

Foundry exports remain `.local/next-five-coverage-v2-2026-09-11/release/<task-id>/export`. The controller uses its frozen copy of the same evidence manifest to select them.

## Launch instructions

Use absolute paths and the existing login-shell Claude/Codex credentials. Do not print or paste tokens. No new authentication setup is needed.

1. Read this handoff, then run the single read-only verifier:

```sh
node "/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/scripts/verify-hardened-next-five-trial-three.mjs"
```

2. Check actual Docker/memory availability once. Confirm the **new trial-three campaign** has not dispatched. If it already has, monitor that campaign rather than creating duplicates. At preparation no trial containers were running. The launch-time resource checks remain in the controller.

3. Launch once through the normal tool path:

```sh
node "/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/.local/hardened-next-five-trial-three-2026-09-11/campaign.mjs" run --user-authorized-five-concurrent-v3-trial-3
```

Do not rerun prepare, rebuild packages, create another controller, or repeat all engineering validations. All five start through the existing concurrent dispatcher. Confirm the five container starts and dispatch times, then monitor through completion. Preserve partial evidence and report any infrastructure error without retrying automatically. Use the normal approval mechanism if an execution tool requires permission.

## Analysis and publication

Verify each completion manifest. Preserve raw results and requested/observed model identity, service/checker evidence, duration and usage. Analyze each fresh submission independently; the agent is blind to previous submissions, grades, reference solutions and analysis docs.

Record service and checker outcomes separately. A missing required verdict is a checker interface failure, even when every service scenario passes. If the grader takes its known early-return path, retain raw checker output and report the exact missing/extra tokens. A synthetic zero-correct fallback is not evidence that every other candidate was misclassified. Missing `grade-summary.json` alone does not constitute an infrastructure interruption.

For context, Trial 4 had four shape-gate failures: Route, Browser, Calendar and Budget. Budget also had an input-shape defect. Workflow reached ordinary grading and rejected four valid candidates. The prior handoff described the previously saved checker, not a prediction of how a fresh solver would fail. Assess recurrence from actual evidence.

Append **Trial 5 — 3.0.0 / coverage-v2, attempt 3** to all five original analyses linked above. Keep existing trials, grading corrections and replays intact. Do not silently reclassify old attempts, mix task versions or count replays as new model calls.

Publish:
- `reports/screening/hardened-next-five-trial-three-2026-09-11.md`
- `reports/screening/evidence/2026-09-11-hardened-next-five-trial-three.json`

Update README, project status, screening index and publication inventory, preserving the previous five finalists' standings. Run publication checks, focused publication tests and `git diff --check`. Return the five-result table and evidence-backed recommendations, including which tasks merit an opposite-provider block next.

No commits, pushes, external messages or further model attempts.
