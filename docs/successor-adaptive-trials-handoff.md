# Five hardened successors: adaptive trial campaign

Work only in `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.

The successor implementation and checker audit were committed as `23aad5a` and merged into main as `4a78cf2`. This campaign uses the audited **2.0.1** packages, with **3.0.1** for Compatible Rollout. The earlier 2.0.0/3.0.0 handoff is superseded by those hardened versions.

| Package | Version | Append trial analysis to |
| --- | --- | --- |
| capacity-maintenance-repair | 2.0.1 | reports/screening/third-five/13-capacity-maintenance-repair.md |
| partial-release-repair | 2.0.1 | reports/screening/next-five/08-partial-release-repair.md |
| verified-installation-repair | 2.0.1 | reports/screening/third-five/12-verified-installation-repair.md |
| compatible-rollout-repair | 3.0.1 | reports/screening/original-five/05-compatible-rollout-repair.md |
| ticket-consolidation-repair | 2.0.1 | reports/screening/next-five/09-ticket-consolidation-repair.md |

## Launch the reviewed controller

The user authorizes this campaign: up to six counted trials per package, ending immediately at its first valid pass. All preparation is complete. Use the **reviewed** controller below. The original controller is retained as part of the immutable preparation; its `verify` command always prints zero provider calls and does not verify final results.

First inspect `git status --short --branch`, then run:

```sh
node scripts/run-successor-adaptive-trials-reviewed.mjs preflight
```

Before the first dispatch, expect `verified: true`, `status: "ready"`, `tasks: 5`, `slots: 30`, `maxConcurrent: 6`, `dispatched: false`, `complete: false`, `attemptsLaunched: 0`, and `providerCallsMade: 0`, followed by `preflight: true`. Preflight checks local credential presence and subscription mode, pinned authoring image availability, resources, and competing provider containers. It does not contact either model provider or prove that credentials will remain valid throughout the campaign.

If `dispatched` is already true, inspect and monitor that existing campaign. Never delete a claim or launch the original controller to get around it. Otherwise run **exactly once**, in a persistent shell session that you can monitor:

```sh
node scripts/run-successor-adaptive-trials-reviewed.mjs run --user-authorized-successor-adaptive-trials
```

Keep the controller alive and preserve its exit status. Monitor until all five packages are terminal and all provider jobs have exited. Do not return with provider jobs or the controller running. If the session is interrupted, use the retained launch PIDs, events, Docker state and dispatch claims to establish what is still running. A missing FINAL file is not permission to redispatch.

## Trial policy

- Start all five independent package loops concurrently. One trial at a time per package, a global ceiling of six, and an expected peak of five.
- Trials 1–3: Claude Opus 5, max effort. Trials 4–5: Codex gpt-5.6-sol, xhigh effort. Trial 6: the same Codex profile, conditional on five prior clean failures.
- Continue after every clean counted failure. Stop a package immediately on its first valid pass or after six clean failures. Never exceed three Claude and three Codex counted trials per package.
- A counted trial requires complete, integrity-verified execution, successful provider-process completion, and resolved service and required-checker grading. Both the service and required checker must pass for reward 1.
- Infrastructure failures, interrupted executions and unresolved grading are unscored incidents. Stop only that package for manual review; do not retry automatically and do not count the incident as a failure. Other package loops continue.
- Use the existing subscription credentials only. No paid API fallback. Each slot retains the existing three-hour wall limit, two CPUs, 2 GiB of memory, fresh solver workspace and pinned scaffold versions.
- Do not change task bytes, graders, checkers, frozen runtime, profiles, scripts, READY files, or preparation/review evidence after dispatch. Do not regenerate the preparation or launch slots by hand.
- Keep private cases, audit details, earlier submissions and this operator handoff out of solver prompts. The slot runner supplies the published task instruction and a fresh workspace.

These are trials of the new successor contracts. Preserve all prior histories and historical trial counts; do not relabel or erase earlier attempts. Keep infrastructure incidents and any subsequently established grading voids separate from counted outcomes.

## Evidence and completion

Campaign root: `.local/successor-adaptive-trials-2026-09-11`.

- `events.jsonl`: launches, adjudicated results, package stops and campaign completion.
- `logs/<package>/trial-N.log` and `launches/<package>/trial-N.json`: child logs and PIDs.
- `adjudicated/`, `outcomes/`, `incidents/`: persisted counted results and unscored incidents.
- `slots/<package>/trial-N/real-campaign-frozen/jobs/real-provider/records/`: immutable completion, capture, grade, submission and evidence manifests.
- `FINAL.json`: completed campaign summary, including any packages stopped for incidents.
- `CONTROLLER-ERROR.json`: controller or evidence-publication failure. Do not treat this as a cleanly completed campaign or retry it automatically.

After the controller exits, run:

```sh
node scripts/run-successor-adaptive-trials-reviewed.mjs verify
```

A completed campaign must report `complete: true`, `status: "complete"`, `finishedTasks: 5` and `activeUnadjudicated: 0`. The verifier checks immutable preparation, frozen source/bundles/dependencies, policy order and stop conditions, retained grading evidence, per-task outcomes and the final summary. `providerCallsMade` is the count of durable provider-attempt dispatch receipts; `attemptsLaunched` also includes slot processes that failed before provider dispatch. Neither number is a count of individual internal model API requests.

A nonzero controller exit with FINAL present can mean a package stopped for an unscored incident. A verified but `in-progress-or-interrupted` status is not completion. Report the incident or interruption with evidence and preserve the remaining conditional slots.

Inspect submitted code and grading records and append a dated successor-campaign section to each original analysis document. Publish a campaign report and matching evidence JSON without changing the task packages. Report every counted trial's provider, service/checker result and reward; the first pass or six-clean-failure stop; unscored incidents separately; dispatch count and peak concurrency; evidence paths; and confirmation of no post-pass launches, automatic retries or paid API fallback. Preserve requested versus actually observed model identity. Finish with the exact FINAL path and `git status --short --branch`. No commits or pushes are requested.
