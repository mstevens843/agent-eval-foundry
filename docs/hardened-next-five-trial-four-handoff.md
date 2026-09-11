# Fourth 3.0.0 attempt: switch providers on all five

Prepared September 11, 2026 UTC. Run **exactly five fresh attempts concurrently**, one per task. These are **historical Trial 6**, the fourth model-attempt round on public version 3.0.0. The task packages and coverage-v2 graders are byte-identical to Trials 4 and 5.

| Task | Next provider | Requested model / effort | Authoring memory |
| --- | --- | --- | --- |
| 14 — Route policy | Codex | openai/gpt-5.6-sol / xhigh | 2 GiB |
| 03 — Browser replay | Codex | openai/gpt-5.6-sol / xhigh | 4 GiB |
| 18 — Recurring calendar | Claude | anthropic/claude-opus-5 / max | 2 GiB |
| 20 — Workflow authority | Claude | anthropic/claude-opus-5 / max | 2 GiB |
| 04 — Delegated budget | Claude | anthropic/claude-opus-5 / max | 2 GiB |

This is intentionally **two Codex and three Claude**, switching every previous assignment. Each gets up to 10,800 seconds, two CPUs, the existing output/submission limits and the pinned subscription CLI image. Use fresh, independent solver workspaces with no previous solutions, trial histories or private grading data exposed.

Browser Trial 5 remains infrastructure-interrupted and unscored. This Codex attempt does not replace a Claude slot: Browser still needs its missing scored Claude attempt later. The separate old `hardened-next-five-trial-three-browser-retry-2026-09-11` controller is deferred and is **not part of this five-call authorization**. Its old 2 GiB profile does not include this mitigation. Do not launch it automatically.

## What changed and what was verified

The [Browser infrastructure report](../reports/screening/browser-runtime-reliability-2026-09-11.md) and [evidence](../reports/screening/evidence/2026-09-11-browser-runtime-reliability.json) document the abort, mitigation and offline tests. The original cause remains unconfirmed. Browser's authoring memory increases from 2 to 4 GiB; bounded host-owned resource diagnostics and disabled core dumps apply to the new authoring runtime. These do not change grading or task requirements.

The actual pinned image completed an offline Chromium workload with a measured memory peak above the old 2 GiB allowance. Large screenshot events were captured successfully, and an intentionally aborted process remained an execution error. No provider calls were made for these checks.

The [preparation manifest](../reports/screening/evidence/2026-09-11-hardened-next-five-trial-four-preparation.json) binds the controller, READY.json, frozen source, build log, dependencies and unchanged export digests. `provenance.json` lists source changes from the completed Trial 5 runtime; the only changed execution source files are `src/execution/real-provider.ts` and the new `src/execution/authoring-diagnostics.ts`. `controller.diff` shows the adaptation from your completed Trial 5 controller. The runtime was built inside this campaign's own frozen copy. It imports no live `dist` and does not use the live repository source digest during launch.

Frozen source digest: `597df061330dad6fc300dc1bf12fdbc12d29817b1e6d58c80732fc4dea71accc`.
Bundle SHA256: `c0a422da75fbc5bac969fcd614a329458780205fc3dcd034cb9f287699fef8d8`.
Verification covers 894 source/config files and 2,088 dependency entries. All five previous completion manifests were reverified: 4,245 retained files, including the interrupted Browser record. The existing native oracle/nop and integrity results remain attached to the unchanged packages.

At final preparation, no trial containers were active, Docker had 10 CPUs and 15.6 GiB RAM, macOS reported 51% memory free, and disk had about 18.8 GiB available. The five authoring limits total 12 GiB; the controller checks another 2 GiB of Docker headroom and the existing 8 GiB disk minimum at launch. These are launch-time observations, so check them again immediately before dispatch.

## Run once

Use the existing login-shell credentials. Do not print tokens or introduce new authentication setup. Use these absolute paths so the shell's current directory cannot change which controller is executed.

Read-only verification:

```sh
node "/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/scripts/verify-hardened-next-five-trial-four.mjs"
```

Then launch once through the normal tool permission mechanism:

```sh
node "/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/.local/hardened-next-five-trial-four-2026-09-11/campaign.mjs" run --user-authorized-five-concurrent-v3-trial-4
```

The new campaign has been prepared and verified with **zero provider calls and no dispatch claim**. If its `real-campaign-frozen/DISPATCH-CLAIM` exists when you take over, inspect and monitor that campaign rather than creating duplicates. Completed older campaigns are expected to retain their claims.

Do not rebuild packages, alter the frozen runtime, rerun prepare, create a substitute controller, or repeat whole-portfolio validation. The controller uses `Promise.allSettled` to start all five jobs together. Confirm all five container starts and dispatch times, then monitor through completion. A three-hour budget is a maximum, not a required duration.

Run root: `.local/hardened-next-five-trial-four-2026-09-11/real-campaign-frozen/`.
Each attempt now retains `authoring-resources.jsonl` and a diagnostics summary in `authoring-runtime.json` alongside the existing process state and capture logs. If an attempt interrupts, preserve those files and report it as unscored; no automatic retry, provider substitution or additional model call is authorized. Keep raw grades and any later adjudication distinct.

## Write-up

Append **Trial 6 — fourth 3.0.0 attempt / coverage-v2 / provider switch** to each original analysis document:

- Route: `reports/screening/third-five/14-route-policy-repair.md`
- Browser: `reports/screening/original-five/03-browser-replay-repair.md`
- Calendar: `reports/screening/fourth-five/18-recurring-calendar-repair.md`
- Workflow: `reports/screening/fourth-five/20-workflow-authority-repair.md`
- Budget: `reports/screening/original-five/04-delegated-budget-repair.md`

Preserve every previous result. Report reward, service and required-checker outcomes separately. A missing checker grade-summary can represent an intentional output-shape rejection; inspect the actual submitted output and grading evidence before assigning a cause. Treat service-correct/checker-wrong results under the existing checker-required task contract. Do not add new benchmark requirements.

Verify recurrence claims against the saved submitted code. Publish `reports/screening/hardened-next-five-trial-four-2026-09-11.md` and its sanitized evidence JSON, update the README, screening index, project status and publication inventory, and run publication checks and `git diff --check`. Maintain Browser's missing Claude slot explicitly. Return the five results and recommendations. No commits, pushes or additional trials.
