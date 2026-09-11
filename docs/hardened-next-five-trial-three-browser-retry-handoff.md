# Single browser-replay-repair retry: resolving Trial 5's infrastructure interruption

> **Superseded preparation; do not launch.** Browser's fresh Claude T10 in the completed continuation filled the missing counted slot. Browser is complete at 6/6 reward=0, three trials per provider. The earlier interrupted attempt remains unscored and this standalone retry was never dispatched. [Final results](../reports/screening/final-results-2026-09-11.md).


**Earlier disposition, before the final continuation:** This old 2 GiB retry is deferred and has not launched. The user requested a five-task provider switch instead. Use the [Trial 6 handoff](hardened-next-five-trial-four-handoff.md), which includes the tested Browser memory mitigation and new diagnostics. That campaign does not fill Browser's missing Claude slot. The remainder of this document preserves the earlier preparation record. The [new infrastructure report](../reports/screening/browser-runtime-reliability-2026-09-11.md) also narrows the original capture-code exclusion claim: no quota guard fired, but the abort's cause remains unconfirmed.

Prepared September 11, 2026 UTC. **One fresh attempt, Claude only, resolving the Trial 5
`browser-replay-repair` attempt that hit a container-level infrastructure interruption before
grading began.** Preparation made zero provider calls. Not authorized to launch until the user
gives explicit go-ahead — this handoff documents readiness, not a launch instruction.

## Why this exists

Trial 5's `browser-replay-repair-attempt-1` container exited with code 134 (SIGABRT) after
1,898,868ms (~31m39s) of authoring, before grading began. `result.json` already records
`outcome: "invalid-execution"` and `countsAsModelFailure: false`. Root-cause investigation (see
[the Trial 5 report](../reports/screening/hardened-next-five-trial-three-2026-09-11.md#infrastructure-interruption-browser-replay)):

- Docker's own container inspect shows `ExitCode:134, OOMKilled:false, Error:""` — no cgroup-level
  OOM kill, no daemon-level error.
- `stderr.log` is 0 bytes; `stdout.log` ends cleanly with a complete, well-formed event, not a
  mid-write truncation.
- `src/execution/capture.ts` was read in full this session and its control flow independently
  confirms its 4 MiB event-line-limit and overall byte-quota guard did **not** fire before the
  child's natural exit — this project's own capture/execution code is cleared.
- **No confirmed defect was found.** The crash originated inside the solver CLI process itself
  (the container's PID 1). The container's 2048 MiB memory cap alongside a real Chromium instance
  and a long, thinking-heavy session (163,301 cached input tokens at crash time) is a plausible
  but unproven explanation.

Since no defect was confirmed in this project's own code, nothing was changed: the task package,
checker coverage, frozen runtime and profile are byte-identical to Trial 5.

## What is prepared

Repository: `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.

Campaign: `.local/hardened-next-five-trial-three-browser-retry-2026-09-11/`.
Execution records: its `real-campaign-frozen/` subdirectory. `READY.json` already exists.

The runtime is a verified byte-identical copy of Trial 5's own `frozen-source/` (2,998 files,
every one independently re-hashed and compared this session) — not rebuilt, not substituted.
Frozen runtime source digest: `b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`.
Pinned bundle: `04cd21bb17982ed40cdbd2adbb8bbd75becd4963c769ca91ba22d08c84253d81`. `evidence.json` is
byte-identical to Trial 5's. `previous-controller.mjs`, `controller.diff` and `provenance.json`
document the narrow, reviewable adaptation from Trial 5's five-job controller to a single job.

Package digest `712f97575821006724eef7f3b3161c97512019897af62e46ab32b9c32dcddf31` and profile
digest `d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794` — both independently
confirmed to match the interrupted Trial 5 attempt's own recorded `result.json` exactly. Same
`anthropic/claude-opus-5`, effort `max`, via Claude Code. Same 10,800-second maximum.
Subscription-only billing, no paid API fallback, no automatic retries beyond this one attempt.

## Verify, then launch only on explicit confirmation

```sh
node "/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/scripts/verify-hardened-next-five-trial-three-browser-retry.mjs"
```

This independently re-hashes all 2,998 frozen-source files against Trial 5's own copy, confirms
the bundle hash, confirms `evidence.json` is byte-identical, confirms `READY.json`'s single
package/profile digest matches the interrupted attempt's own recorded identity, confirms no
dispatch claim exists, and delegates to the controller's own `verify` mode. Already run once this
session; passed cleanly with zero provider calls.

If launched:

```sh
node "/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/.local/hardened-next-five-trial-three-browser-retry-2026-09-11/campaign.mjs" run --user-authorized-one-browser-retry-v1
```

A distinct approval flag (`--user-authorized-one-browser-retry-v1`) from every prior five-way
campaign's flag, so it cannot be launched by an accidental copy-paste of the wrong command.

## A note on disk space

Host disk free space dropped from 14 GiB to 6.4 GiB over the course of Trial 5 (see `df -h
/System/Volumes/Data`), on a volume that is 99% full. This retry's own frozen-source copy adds
~159 MB, and a single job's own evidence footprint should be modest, but the underlying disk
pressure is real and worth attention independent of this retry — much of `.local/`'s ~384 GiB is
historical implementation/preparation directories from completed campaigns.

## Result handling

If launched and the attempt completes (scored or another infrastructure interruption), append its
result as part of the `browser-replay-repair` package's existing "Trial 5" history in
[03-browser-replay-repair.md](../reports/screening/original-five/03-browser-replay-repair.md) —
label it clearly as the retry of the interrupted attempt, not a new numbered trial. Update the
Trial 5 campaign report and evidence JSON to reflect the resolved outcome. Preserve the original
interrupted attempt's evidence and this retry's evidence as two distinct, hash-linked records — do
not overwrite or merge them.
