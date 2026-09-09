# 01 — Certificate authorization repair

The clean-instruction Codex attempt solved the frozen package: reward 1, reported duration **13m 04s**. The earlier 5m 21s attempt was contaminated and is not diagnostic evidence of unaided solving.

## The task and package

Repair an original Go certificate-order service. Each order contains domain identifiers with cached authorizations. Stale authorizations must be queried concurrently; each response must remain associated with its own domain even when responses arrive out of order. An unavailable authority leaves that identifier indeterminate rather than abandoning the entire order. Cache updates must remain correct for subsequent orders.

The package included outcome-oriented instructions, a semantics contract, a multi-file service, visible tests, a separate authority process, and hidden scenarios with suite-level activation checks. The verifier checked actual authority behavior and subsequent cached outcomes, not the service's claimed counts.

## Dispatch correction

The initial dispatcher selected README.md rather than instruction.md. The README was an author document containing a solution explanation. This invalidates an unaided-diagnosis claim for that attempt, regardless of how good the resulting code was. The clean retry used the correct instruction and independently produced a passing repair. Future dispatch should bind an explicit instruction artifact, never guess from a filename pattern.

## What the recorded repair did

The clean retry keyed concurrent answers by identifier instead of positional arrival order. It retained per-identifier indeterminate outcomes on authority errors and refused orders whose required conjunction was not satisfied. It also tightened JSON parsing so trailing malformed content was not silently ignored.

The recorded work included reading the contract and service, constructing targeted regression tests, formatting, compilation and Go testing. The earlier contaminated attempt also ran the race detector; that observation must not be silently attributed to the clean retry. Both produced passing grades, but only the clean-instruction attempt informs unaided task difficulty.

## What we learned

The package has a legitimate concurrency/identity problem, but this attempt did not struggle for the intended expert time budget. The concentration of the primary defect in a small reconciliation function remains a construction weakness. Larger domain-native interactions could be worth developing; unrelated worker crashes or outbox revocation rules are not automatically appropriate for CAA.

The right lesson is not that isolation was unnecessary: isolation protects the measurement, while professional obligations determine the work. Neither protection nor a passing reference proves hardness.

## Evidence boundary

[Sanitized records and hashes](../evidence/2026-09-07-original-five.json) identify the clean retry and explicitly exclude the contaminated attempt. [Maintained task](../../../tasks/caa-revalidation-repair/) is author-facing; only its approved public assembly belongs in a solver workspace. Requested Sol/xhigh settings are not independent runtime attestation. [Batch limitations](../README.md) apply.

## Trial 2 preparation — final group (2026-09-09)

**Ready for second exploratory trials through Foundry or native Harbor.** Replaced the mostly implemented Go service with a compilable CLI stub and read-only public types. The private oracle now installs the complete Go service rather than a single planner file. Retained the independent alternative, separate authority/verifier, 24 scenarios and artifact/process controls. Shortened the prompt to its normative contract and interfaces. Configured the upstream canary template with CAA’s existing unique GUID and renamed the existing experience heading to match the static schema. CAA retains its native Go service deliverable; no Node checker is required.

Local validation passed **27 assurance checks**, including a semantic failure for the untouched starter. Its native Go oracle passes the 24-scenario suite; no submitted checker is part of this task. The final native export passed 22 static checks, Harbor oracle reward 1 and nop reward 0, with no infrastructure exceptions. Both export formats reproduce. No model attempt was launched by this engineering work.

Foundry export: `.local/final-five-implementation-2026-09-09/caa-export`. Package digest: `b60aea7eb0a356f87215b0f366fa63d4f97047f290e9784b2cbc031eb0899eac`. Native export: `.local/final-five-implementation-2026-09-09/harbor-ready/caa-revalidation-repair`. Native digest: `c649ff8980eda3fad1cb981ef930cda16d609e98df87e1441184388857ba169f`. Suggested target: **Codex**, retaining the original model family. Append the eventual Trial 2 outcome below this engineering record; preserve Trial 1.

[Implementation and completed checks](../final-five-implementation-plan-2026-09-09.md) · [Exact evidence](../evidence/2026-09-09-final-five-implementation.json).

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `caa-revalidation-repair-attempt-1`, package digest
`b60aea7eb0a356f87215b0f366fa63d4f97047f290e9784b2cbc031eb0899eac`, route
`native-caa-separate-verifier@1` — distinct from the Node portfolio route the other
four packages in this campaign use. Dispatched through this session's `real-provider`
execution route (signed JobStore reservation, Ed25519, realm `real-provider`,
`billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`) — a fresh
campaign slot (`attempt-1`), not an infrastructure retry of any prior run. Author
image `sha256:c1e434806d5b8b83ec5d3c3b85408d56d8c3f0768a56a93ad1c478587b40b674` — a
native-specific image distinct from the standard portfolio image the other four
packages in this campaign use. Evidence retained at
`.local/round-two-final-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/caa-revalidation-repair-attempt-1/`.

Target: **codex**. Requested `openai/gpt-5.6-sol`, effort `xhigh`, CLI
`scaffoldVersion 0.153.2` (verified baked into the pinned native author image).
Observed from runtime events: model, effort and scaffold version were not exposed by
the CLI's event stream and remain unobserved — a known instrumentation limit for
Codex captures generally, not specific to this native route.

Dispatched 2026-09-09T17:31:23.247Z as one of five reservations installed within a
334ms window (17:31:23.079Z–17:31:23.413Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently, so this was a genuinely concurrent
five-way campaign. A sixth, separately-authorized job (`route-policy-repair`, an
unrelated package from a different, prior interrupted campaign) was deliberately
dispatched roughly 102 seconds later as an additional concurrent job on this host;
it does not affect this job's own valid execution. Completed 2026-09-09T17:49:48.817Z.
Total elapsed ≈1,105,570ms (~18m26s) — solver authoring time (capture wall clock)
≈1,095,043ms (~18m15s), grading ≈10.5s. Token usage: 893,634 input tokens (819,456
cached), 32,155 output tokens; the Codex CLI reports no price estimate. Execution
reached a clean `completed` state with no invalid-execution or infrastructure error.

### B. What changed since Trial 1

The mostly-implemented Go service was replaced with a compilable CLI stub and
read-only public types (`internal/order/order.go`, unchanged from Trial 1's public
contract). The private oracle now installs the complete Go service rather than a
single planner file, and the prompt was shortened to its normative contract and
interfaces, removing the worked failure explanation that contaminated the original
first-batch dispatch. Unlike the other four packages in this campaign, CAA has **no
checker requirement** — the native separate verifier grades the submitted Go service
directly against the retained 24-scenario suite; there is no independent
release-validator deliverable for this package.

### C. Results

Reward **1** — a clean pass. `evaluation.status: semantic-pass`, all 24 expected
scenario IDs (`sel-01`…`sel-24`) observed with zero missing/unexpected IDs and zero
problems. Expected check IDs fully covered: `report_present`, `outcome`,
`decisions_cover_identifiers`, `authorization_applied`, `authorization_source`,
`store_recorded`, `audit_matches_report`, `rechecked_exactly_the_stale`,
`rechecks_issued_together`, `no_unnamed_or_late_query`. `checkerRequired: false`,
`checkerPassed: null` — checker is explicitly not applicable to this native package.

### D. Observable solving behavior

A compact run — 51 captured top-level events for ~18 minutes of authoring. The agent
read the full contract first (`SEMANTICS.md` in two ranges, the public `order.go` and
stub `main.go`, the test harness's `run-scenario.sh`, and — notably — the mock
authority server's own source at `/app/harness/cmd/devauthority/main.go`, giving it
ground truth for how the authority protocol actually behaves rather than inferring it
from prose alone) and checked its environment (`go version`, file permissions, tree
depth, `git status`) before writing anything.

The submitted `service.go` keys concurrent authority responses by identifier name in
a mutex-protected map (`queryAll`/`queryAuthority` over a `sync.WaitGroup`), so
out-of-order concurrent replies can never be misattributed to the wrong domain — the
core concurrency/identity requirement the task and Trial 1's own retrospective (above)
flagged as the primary defect surface. Indeterminate authority failures produce a
`Source: Indeterminate` decision without touching that identifier's stored cache
entry, so a transient authority outage cannot silently downgrade or overwrite an
existing cached result for an unrelated or already-fresh identifier. Any
non-`Permit` decision forces the whole order to `Refused`. Artifacts are written via
temp-file-then-atomic-rename (`writeRegularFile`), and a malformed order is rejected
before any report/audit file is created at all (validated by the agent's own
`TestRunMalformedOrderProducesNoReport`).

It wrote three of its own regression tests in `service_test.go`: mixed
freshness/concurrent-query handling (spins up a real Unix-socket test authority,
holds two queries until both have arrived to force genuine concurrency, then asserts
the report, audit and store all agree and that the correct two identifiers were the
ones actually queried), indeterminate-does-not-overwrite-stale-entry (authority
returns an explicit error; asserts the old cached decision and timestamp survive
untouched while an unrelated concurrent success is still persisted), and the
malformed-order test above. It ran `go test ./...`, `go vet ./...`, and — because the
implementation is concurrency-sensitive — `go test -race ./...` repeatedly across at
least four iterations, interleaved with `gofmt -w` passes and rebuilds
(`go build -trimpath -o ... ./cmd/certd`). It also ran all five of the harness's own
supplied scenarios (`all-current`, `single-stale`, `mixed-ages`, `refused-order`,
`authority-unavailable`) directly via `run-scenario.sh`, both mid-development and
again as a final pass before declaring done, rather than relying solely on its own
unit tests.

Its final completion message claims: the eight-hour cache freshness boundary,
concurrent authority rechecks, correct `PERMIT`/`FORBID`/failure/invalid-response
handling, ordered report with matching audit, partial cache updates that retain
stale entries after indeterminate checks, atomic size-bounded JSON writes, CLI and
malformed-input validation, a runtime timeout cap, and that "the specified read-only
files were not modified." Every one of these claims is directly traceable to code
this review read and to grading that in fact passed cleanly (all 24 scenarios,
zero problems) — no overclaiming found. The explicit note about not touching
read-only files is consistent with this project's protected-file convention
(`go.mod` and the order type definitions), which the submission indeed leaves
untouched.

### E. Comparison and next step

Trial 1's clean-instruction attempt also reached reward 1 in 13m04s from a
substantially pre-implemented starter, after an earlier contaminated 5m21s attempt
was excluded for having been dispatched the author README instead of the actual
instruction. Trial 2, working from an empty CLI stub with only the public types
retained, reached the same clean-pass outcome in a longer 18m15s of authoring —
consistent with genuinely reconstructing the reconciliation logic from the contract
rather than lightly patching an already-working implementation, and consistent with
Trial 1's own retrospective note that the primary defect concentrates in a small
reconciliation function: that function is exactly what this attempt had to write
from scratch. Given two independent clean passes (one lightly-scaffolded, one from
an empty stub) and correct handling of the concurrency/identity requirement flagged
as the package's core difficulty, retain these submissions as correct controls and prioritize observed reward-zero
candidates for further failure-finding trials.

### F. Verified publication record — September 9, 2026

Reward **1**; service **24/24**; checker **N/A — native service only**. All **269** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-final-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-final-five.json). Earlier trial records are preserved.
