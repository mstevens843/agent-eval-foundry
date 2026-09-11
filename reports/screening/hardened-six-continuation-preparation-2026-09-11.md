# Conditional continuation to six counted trials

September 11, 2026. **The existing Round 5 campaign remains untouched and running.** The next conditional attempts are prepared, with zero provider calls made by this preparation.

The user confirmed the starting totals below and authorized continuation after reward-zero results, stopping each task on its next pass or at six counted trials. The [counting ledger](evidence/2026-09-11-hardened-six-counting-ledger.json) explicitly records the first-round corrected grades previously documented in the coverage-v2 replay. Route and Browser's original first-round reward-one records remain intact; their already-reproduced checker failures count as zero under that documented regrade. Workflow's first-round zero uses the corrected host and independent legal-retry checker defect, preserving the original host-bug explanation.

| Task | Failures / counted before Round 5 | Further calls after Round 5, maximum |
| --- | ---: | --- |
| Route policy | **3/4** | 1 Codex |
| Browser replay | **2/2** | 2 Codex, then 1 Claude |
| Recurring calendar | **4/4** | 1 Claude |
| Workflow authority | **4/4** | 1 Claude |
| Delegated budget | **4/4** | 1 Claude |

That is **17 reward-zero outcomes in 18 counted trials**, with Browser's grading void and earlier infrastructure interruption retained separately. These are pre-Round-5 counts, not results from the running campaign. Route's later clean Codex pass is retained. The original five finalists and their 28/30 result are unchanged.

There are at most **seven additional calls after the five already running**. Each completed six-run set must contain three Codex and three Claude trials. Browser's final Claude slot fills the existing gap; it uses the current coverage-v3 package and 4 GiB authoring profile, not the deferred old standalone retry. All other follow-up profiles and all five exports retain the current Round 5 bytes and settings.

The [prepared continuation](evidence/2026-09-11-hardened-six-continuation-preparation.json) contains seven verified, unused, one-attempt controllers derived from the running controller. They reuse the same frozen runtime read-only. A parent runner adopts Round 5's completed records, starts at most five tasks concurrently, and never starts a second attempt for the same task until its first result is available. New passes stop only their task. Infrastructure or unresolved grading stops that task without counting it or retrying automatically. A stop before six is reported as the user's chosen stopping rule, not automatically as failure to reach the 5/6 threshold.

Seven focused scheduling tests cover adoption without rerunning, every possible pass position, unscored interruptions, provider balance, Browser's missing Claude slot, duplicate results and the six-counted cap. They pass without Docker or provider calls. Independent preparation verification checks controller diffs, frozen identities, package/profile digests and unused dispatch claims.

Use the [operator handoff](../../docs/hardened-six-continuation-handoff.md). The runner emits a result event and a start event for every attempt so the operator can relay progress during the campaign. It refuses to launch while Round 5 is still running. No new task requirements, grading revisions, runtime rebuilds, commits or pushes were made by this preparation.
