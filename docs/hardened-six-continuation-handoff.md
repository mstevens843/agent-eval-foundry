# Continue after the already-running Round 5

> **Completed campaign; historical instructions.** Four tasks finished at 6/6 reward=0. Route stopped at 3/5 failures. All counted provider slots needed by the qualifying tasks are filled; these instructions do not authorize another launch. [Final combined results](../reports/screening/final-results-2026-09-11.md).


**Leave Round 5 running under its existing controller.** Do not rerun it, change its files, stop its processes or launch a second copy. This handoff extends the user's authorization to conditional follow-up attempts after Round 5 finishes.

The user requests: continue each task after clean reward-zero outcomes until it has **six counted trials**, with **three Codex and three Claude**. **Stop that task immediately on its next reward-one outcome**, including a pass in the currently running Round 5. Report each result and each subsequent start. No automatic retry after an infrastructure interruption or unresolved grading issue.

## Starting counts and maximum remaining work

These counts are through Round 4, before any result from the running campaign. The [explicit counting ledger](../reports/screening/evidence/2026-09-11-hardened-six-counting-ledger.json) now records the previously documented first-round regrades used in the user-confirmed totals. Original grades remain unchanged.

| Task | Reward-zero / counted | Counted providers before Round 5 | Running Round 5 | Further slots, only after preceding zeroes |
| --- | ---: | --- | --- | --- |
| Route policy | 3/4 | 3 Claude + 1 Codex | Codex, historical T7 | Codex T8 |
| Browser replay | 2/2 | 2 Claude + 0 Codex | Codex, historical T7 | Codex T8, Codex T9, Claude T10 |
| Recurring calendar | 4/4 | 3 Codex + 1 Claude | Claude, historical T7 | Claude T8 |
| Workflow authority | 4/4 | 3 Codex + 1 Claude | Claude, historical T7 | Claude T8 |
| Delegated budget | 4/4 | 3 Codex + 1 Claude | Claude, historical T7 | Claude T8 |

Maximum **seven new calls after the five already running**. Browser needs three further calls because its prior Codex grading void and Claude interruption are excluded. Its final Claude slot fills the missing provider slot using the current validated Browser package and 4 GiB authoring memory. Do not launch the old 2 GiB standalone retry.

Route's existing pass stays counted and does not cancel its explicitly authorized Round 5 continuation. The stop-on-pass instruction applies to a **new pass from Round 5 onward**. If a task stops at 4/5 failures, for example, report “stopped on a pass per user instruction”; do not falsely claim it is mathematically unable to reach 5/6. A package only has a complete six-run result once six counted slots have actually finished.

## Prepared runner

Read the [preparation manifest](../reports/screening/evidence/2026-09-11-hardened-six-continuation-preparation.json). Seven conditional single-attempt controllers have been prepared and verified under `.local/hardened-six-continuation-2026-09-11/slots/`. Each has its own READY and exactly-once dispatch claim. The parent schedules at most **five concurrent attempts, one per task**, and waits for that task's result before starting its next attempt.

Each controller is a small, reviewable adaptation of your current Round 5 controller; its `controller.diff` is retained. All use **the actual existing Round 5 frozen runtime**, verified by source, dependency and bundle hashes. No new runtime was built, and no live task, frozen export or running controller was changed. Grading stays Browser coverage-v3 and the other four coverage-v2.

Continue monitoring Round 5 and publish its results as planned. Once its controller has written `CAMPAIGN-COMPLETE.json` and exited, use the existing authenticated environment:

```sh
cd /Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry
node scripts/run-hardened-six-continuation.mjs verify
node scripts/run-hardened-six-continuation.mjs run --user-authorized-hardened-six-continuation
```

`verify` is safe while Round 5 runs. `run` refuses to dispatch until that campaign is complete and no provider containers remain active. The continuation reads and verifies Round 5's existing records; **it does not rerun those five attempts**. There is no need to run `prepare` again or rebuild any package.

Keep the parent command alive in a persistent monitored shell. Do not run child controllers directly. Normal tool permissions still apply; use the existing subscription credentials without printing them, with no paid API fallback. Existing three-hour limits, resource checks, authoring diagnostics and evidence publication protections remain in force.

## Progress updates and stop behavior

Watch `.local/hardened-six-continuation-2026-09-11/events.jsonl` and the controller's stdout. Relay an update for every `trial-result`, `launch-next-trial`, `task-finished` or `task-stopped-unscored` event. Do not wait until the entire continuation ends to report progress. Use a short recurring check while the background process runs so these updates reach the user promptly.

- Result: task, provider, historical trial number, reward, service/checker result, updated failures/scored, and whether it continues or stops.
- Start: task, provider and next trial number; confirm the actual container start from the child log or Docker when reporting it as running.
- Pass: stop that task and report it. Keep other eligible tasks running.
- Infrastructure or unresolved grading: exclude it, stop that task, preserve evidence and report the incident. Do not retry it automatically or convert it to reward zero.
- Six counted trials: stop. Report the final score and provider balance. Never launch a seventh counted attempt.

The runner emits progress events and enforces scheduling; it does not write chat messages or replace your analysis. A zero is accepted for continuation only from a completed capture, complete grading and verified evidence with consistent package/profile/runtime identities. Inspect the actual submitted code and failing candidates during write-up. If you discover a new grading concern, report it explicitly rather than silently changing the outcome or starting a new sequence.

## Documentation

Append each actual result to its original trial-analysis file, preserving earlier sections:

- Route: `reports/screening/third-five/14-route-policy-repair.md`
- Browser: `reports/screening/original-five/03-browser-replay-repair.md`
- Calendar: `reports/screening/fourth-five/18-recurring-calendar-repair.md`
- Workflow: `reports/screening/fourth-five/20-workflow-authority-repair.md`
- Budget: `reports/screening/original-five/04-delegated-budget-repair.md`

Historical T8 is version Round 6; Browser may also reach T9/Round 7 and T10/Round 8 because excluded attempts do not fill counted slots. Always show counted progress separately from historical numbering. Preserve Browser T6's original reward 1, diagnostic 0 and counted null; preserve its unscored T5 Claude interruption. Keep the first-round regrades distinct from new model attempts.

The runner retains `adjudicated/`, `outcomes/`, `incidents/`, `launches/`, per-child logs and final `FINAL.json`. Publish a continuation report and sanitized evidence, update the original analysis files, README/status/screening index and publication inventory, and run affected publication checks/tests. Report unused slots and why each task stopped. No commits, pushes or attempts beyond this bounded continuation are authorized.
