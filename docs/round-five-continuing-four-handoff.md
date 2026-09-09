# Trial 5: four continuing packages, providers switched

Prepared September 9, 2026. **Four packages are ready for one fresh attempt each,
all four concurrently, with the opposite provider.** Task packages, public inputs,
private grading and controls are unchanged. Preparation made zero provider calls.

Trial 5 is the **fourth attempt on each unchanged successor**, and the **first of
three opposite-provider attempts**. Trials 2–4 completed the original provider's
three runs. Original Trial 1 used an earlier package version and is not added to
this six-run set.

## Assignments and remaining progress

| # | Package | Three completed runs | Rewards, T2 → T3 → T4 | Next provider | Failures needed from remaining three |
| --- | --- | --- | --- | --- | --- |
| 19 | variant-cache-repair | Claude | 0 → 0 → 0 | **Codex** | At least 2 |
| 21 | incremental-build-repair | Codex | 0 → 0 → 0 | **Claude** | At least 2 |
| 25 | issued-report-repair | Claude | 0 → 0 → 0 | **Codex** | At least 2 |
| 10 | temporal-capacity-repair | Claude | 0 → 1 → 0 | **Codex** | All 3 |

This launch is **three Codex and one Claude**. The user authorized **four attempts
total**, one per package in this table. Two further opposite-provider attempts per
package remain outside this launch. Do not dispatch all twelve remaining slots.

Snapshot recovery (11) is excluded: its record is 0 → 1 → 1, so even three later
failures would produce only 4/6. Preserve its history and do not prepare another
attempt for it in this campaign.

The reported CEO threshold is **at least five failures in six scored attempts**,
with **three Claude and three Codex per unchanged package**. The provider switch
does not reset earlier failures or discard passes. Different valid failure
mechanisms can count, and a required-checker failure can count with a correct
service. Exact bug repetition is not an added requirement. Preserve any specific
existing contract-attribution notes separately from raw scores; repetition alone
does not settle an earlier attribution question.

## Prepared execution

Repository: `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.

- Controller: `.local/round-five-continuing-four-2026-09-09/campaign.mjs`.
- Run root: `.local/round-five-continuing-four-2026-09-09/real-campaign-frozen/`.
- Readiness: `READY.json` inside that run root; already prepared, not dispatched.
- [Preparation evidence](../reports/screening/evidence/2026-09-09-round-five-continuing-four-preparation.json) records every export, prior run and selected provider profile.
- Controller diff and check record: `controller.diff` and `handoff-verification.json`
  beside the new controller.

The controller adapts the **Trial 4 controller the operator just ran**. Its changes
select four packages, switch providers, use a fresh campaign directory and reserve
four slots. The signed reservations, credential handling and concurrent execution
mechanisms are retained. Review the diff; no new executor or runtime build is needed.

Runtime remains `.local/round-two-top-five-2026-09-09/frozen-source/dist/index.js`:

- Actual runtime SHA-256: `60695de963e5085dfe8ee4fb09353b1db0169219d9ad9425ac2a997a73b69b26`.
- Recomputed frozen-source digest: `2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4`.

Both were verified against the actual files. Source-identity checks bind to this
frozen source, so unrelated live-repository edits do not affect the controller.
Keep the retained exports, runtime, preparation JSON, controller and READY unchanged.

The assigned provider presets come from actual completed Trial 4 profile files:
Codex's preset from incremental build, Claude's from variant cache. Only the
provider/model/scaffold-specific settings switch. Common resource limits, image,
network, grading route and provenance match the package's previous profile.

- Codex requests `openai/gpt-5.6-sol`, effort `xhigh`, CLI `0.153.2`.
- Claude requests `anthropic/claude-opus-5`, effort `max`, CLI `2.1.263`.
- All retain the same pinned image, bridge networking, 2 CPUs, 2,048 MiB memory,
  output/artifact limits and **10,800-second maximum** per attempt. Finish earlier
  whenever the solver completes; three hours is a ceiling.
- Subscription-only, no paid API fallback, automatic retries or substitutions.

Verification passed: four unchanged export/instruction comparisons, four provider
switches using retained profiles, 69 existing passing assurance checks, controller
syntax, `prepare`, and read-only `verify` from `/private/tmp`. The pinned author
image and existing credential sources were available. At preparation, no Docker
containers were running; Docker had 10 CPUs and 16,748,032,000 memory bytes, and
host memory was 66% free. Briefly recheck resource availability at dispatch.

## Verify and launch once

Preparation is finished. Do not rerun `prepare`, overwrite READY, rebuild live
`dist/`, regenerate packages or create another executor. Read-only verification:

```sh
node /Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/.local/round-five-continuing-four-2026-09-09/campaign.mjs verify
```

Confirm this campaign has not already dispatched and host resources are available.
Launch once through normal tool permissions using the established background-job
mechanism:

```sh
node /Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/.local/round-five-continuing-four-2026-09-09/campaign.mjs run --user-authorized-four-concurrent-trial-5
```

Use existing Claude environment loading and normal Codex authentication. If the
current shell lacks the Claude variable, load the existing `~/.zprofile`
configuration. Do not print or paste credentials. Start fresh solver sessions
with only the original public inputs; do not give solvers prior submissions,
analysis, private controls or this operator handoff. Copying a provider's profile
does not mean copying that prior task's workspace or transcript.

Confirm all four containers are running together and retain names and timestamps.
Monitor through completion. If interrupted or uncertain, inspect the existing
containers, JobStore and records before any further dispatch. Preserve partial
evidence; infrastructure interruptions are unscored. Do not delete a dispatch
claim to relaunch blindly. Internal `attempt-1` IDs are local to this fresh
campaign; the history label is Trial 5.

## Analyze and publish

Append **Trial 5 — first opposite-provider attempt** to these original histories,
preserving Trials 1–4:

- [19 — Variant cache](../reports/screening/fourth-five/19-variant-cache-repair.md).
- [21 — Incremental build](../reports/screening/fifth-five/21-incremental-build-repair.md).
- [25 — Issued report](../reports/screening/fifth-five/25-issued-report-repair.md).
- [10 — Temporal capacity](../reports/screening/next-five/10-temporal-capacity-repair.md).

Record package/profile identity, provider change, requested and observed model
separately, elapsed time, reward, overall outcome, service/checker counts,
self-test evidence and failure mechanism. Compare with the three original-provider
attempts. An overall zero with a correct service has overall `semantic-fail` and
separate service `semantic-pass`. Reason text remains diagnostic-only. Apply the
benchmark rules and unchanged public contract without adding a same-bug rule or
requiring disclosure of solution steps and every hidden test.

Verify completion manifests, then publish:

- `reports/screening/round-five-continuing-four-2026-09-09.md`.
- `reports/screening/evidence/2026-09-09-round-five-continuing-four.json`.
- README, screening index, project status and publication checks/tests.

After a normal completion, each package has **three original-provider attempts
and one opposite-provider attempt**, leaving two opposite-provider slots. Count
all outcomes in the same six-run record. For 10, another pass puts this set below
5/6; for 19/21/25, one pass still leaves a path to 5/6 if both remaining runs fail.
Report progress and any exclusions without launching extra attempts.

Before this launch, successor totals remain **36 attempts, 35 scored, 12 recorded
zeroes, 23 solver passes and 1 historical interruption**, across 25 packages.
Prepared attempts are not completed trials. Four packages continue, three with
three consecutive zeroes and one with two failures and one pass. Preserve
historical campaign totals and snapshot recovery's excluded record. Do not
commit or push unless requested.
