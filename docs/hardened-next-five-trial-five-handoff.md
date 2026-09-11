# Round 5: same-provider continuation for all five tasks

> **Completed campaign; historical instructions.** Four tasks finished at 6/6 reward=0. Route stopped at 3/5 failures. All counted provider slots needed by the qualifying tasks are filled; these instructions do not authorize another launch. [Final combined results](../reports/screening/final-results-2026-09-11.md).


Run **one fresh attempt per task, all five concurrently**. This is **Round 5 on public version 3.0.0**, recorded as **historical Trial 7** in each original analysis document. Keep the providers from Round 4; do not switch them again.

| Task | Provider | Private coverage | Append analysis to |
| --- | --- | --- | --- |
| 14 Route policy | Codex | coverage-v2, unchanged | [14-route-policy-repair.md](../reports/screening/third-five/14-route-policy-repair.md) |
| 03 Browser replay | Codex | coverage-v3 | [03-browser-replay-repair.md](../reports/screening/original-five/03-browser-replay-repair.md) |
| 18 Recurring calendar | Claude | coverage-v2, unchanged | [18-recurring-calendar-repair.md](../reports/screening/fourth-five/18-recurring-calendar-repair.md) |
| 20 Workflow authority | Claude | coverage-v2, unchanged | [20-workflow-authority-repair.md](../reports/screening/fourth-five/20-workflow-authority-repair.md) |
| 04 Delegated budget | Claude | coverage-v2, unchanged | [04-delegated-budget-repair.md](../reports/screening/original-five/04-delegated-budget-repair.md) |

## What has already been completed

The [coverage report](../reports/screening/browser-coverage-v3-2026-09-11.md), [grading manifest](../reports/screening/evidence/2026-09-11-browser-coverage-v3.json) and [preparation manifest](../reports/screening/evidence/2026-09-11-hardened-next-five-trial-five-preparation.json) record completed local assurance, correct alternatives, saved-submission replay, native oracle/nop, integrity controls, static checks and export reproduction. Browser's new scenarios catch its saved checker rejecting a permitted existing-dialog confirmation without a redundant submission. No public requirements changed.

The runtime is a byte-identical copy of **your completed Round 4 frozen runtime**, including its source, dependencies and built artifacts. It was not rebuilt from the live repository. `runtime-copy.json`, `runtime-verification.json`, `dependencies.json`, `provenance.json` and `controller.diff` in the campaign directory describe the exact copy and narrow controller changes. The independent verifier recomputes actual hashes before invoking that runtime. It does not rely solely on the copied directory's own claims.

## Counting to preserve

- Route's Round 4 / historical Trial 6 Codex **reward 1 stays counted**.
- Browser's Round 4 / historical Trial 6 Codex attempt is explicitly **void for grading coverage**: original reward 1, diagnostic regrade 0, counted reward **null**. Its next fresh Codex attempt fills that excluded slot. Preserve the original attempt and hashes; do not count the diagnostic replay as another failure.
- Browser's earlier Round 3 / historical Trial 5 Claude crash remains separately **unscored**. The missing Claude slot remains pending. Do not launch the old standalone Claude retry in this campaign.
- Calendar, Workflow and Budget's last reward-zero outcomes stay counted. Earlier histories and dispositions are not reset by this preparation.

The [counting disposition](../reports/screening/evidence/2026-09-11-browser-round-four-disposition.json) is authoritative for these latest decisions. Keep original reward, diagnostic regrade, counted reward and exclusion reason as separate fields in new reporting.

## Verify and launch

Use the existing authenticated subscription environment. Do not print credentials or use paid API fallback. From the canonical repository path, run:

```sh
cd /Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry
node scripts/verify-hardened-next-five-trial-five.mjs
node .local/hardened-next-five-trial-five-2026-09-11/campaign.mjs run --user-authorized-five-concurrent-v3-trial-5
```

Preparation has already run. Do not rerun `prepare`, rebuild the frozen runtime, edit READY, change package files, substitute profiles or create another controller. Before dispatch, the verifier checks the actual source, bundle, dependencies, export digests, unchanged provider/profile assignments, counting disposition and original record hashes. Check for an existing `DISPATCH-CLAIM` and active campaign before launching a duplicate command. If dispatch already happened, monitor that campaign instead.

The controller starts the five independent jobs together, with a hard limit of five provider calls and no automatic retries. Keep the controller running through completion; use a persistent background shell/session that you can monitor. Preserve its actual exit status. Confirm all five solver containers are live concurrently and record dispatch times.

Profiles retain the pinned Codex `gpt-5.6-sol` and Claude Opus 5 configurations from Round 4, 10,800 seconds per task, two CPUs per task, Browser 4 GiB and the others 2 GiB. Existing host resource checks, scoped 512 MiB evidence publication budget, gzip evidence logs and authoring diagnostics remain in effect. An actual resource/preflight failure should be reported with evidence; it is not a solver failure.

## Analyze and publish

Use fresh blind workspaces. Keep prior submissions, audit details, private grading data and this handoff out of solver prompts. Grade each service and required checker separately. Investigate apparent harness failures and output-shape failures before assigning cause. A service pass does not excuse an incorrect required checker. Grade only the published requirements; do not add new task restrictions to justify a failure.

Append a dated **“Round 5 / historical Trial 7 — 3.0.0”** section to each original analysis file. Preserve prior text and clearly state each task's private coverage revision. Publish `reports/screening/hardened-next-five-trial-five-2026-09-11.md` and matching evidence JSON, then update README, project status, screening index and publication inventory. Include reward/service/checker counts, actual provider identity, runtime, evidence hashes, concrete defects and accurate recurrence claims. Compare submitted code before claiming the same bug recurred.

Run publication verification, affected publication tests and `git diff --check`. Return the five-result table and updated counted histories, showing grading voids and infrastructure interruptions separately. No commits, pushes, additional attempts or provider switches are authorized by this handoff.
