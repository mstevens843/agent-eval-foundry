# 03 — Browser replay repair

Claude solved the frozen browser task: reward 1, **16/16 scenarios**, reported duration **25m 35s** for the completed retry. The earlier 9m 54s attempt ended in a capture infrastructure error, not a model failure.

## The task and package

Replay recorded form actions against real Chromium pages whose live state can differ from the recording. Forms can remount, decoys can share selectors, inputs can lose their value, buttons can be disabled and confirmation dialogs can appear. The service must act on the intended entity, verify current preconditions and avoid duplicate effects across repeated delivery.

The public contract exposed observation, action, settling, dialog and receipt operations. The protected authority owned the browser and real effect ledger; recorded browser trace archives were retained. Hidden checks covered completion, confirmation, current preconditions, exact effects, preservation and truthful reporting.

## What the agent actually worked through

The submission was a substantial rewrite. It surveyed live candidates by entity/field identity, relegated selectors to hints, re-observed after filling, checked receipts around delivery, handled confirmation dialogs and replaced attempt-qualified completion keys with stable step identities.

The captured work included a self-built DOM simulator, checking that tests rejected the original starter, a 3,000-case fuzz exercise and deliberate fault injection. It found bugs in its own repair: conflating a driver error with disconnection, and confusing a leftover dialog with a new dialog when different steps had identical entity/field/value. A final review corrected the priority between genuinely identified-but-disabled elements and merely noncontradictory enabled candidates.

Those are observations of recorded development behavior. The independent result is the sixteen accepted service scenarios, not the agent's self-reported fuzz count.

## Corrections and implications

The early analysis suspected that an unconditional completed report could pass without a real effect. That verifier-blind-spot claim was **retracted**: the independent completion check already compared actual committed effects and would reject missing work. A suspicious reporting path does not establish that the grader accepted an incorrect execution.

Similarly, making completion impossible under a contract that guarantees eventual attainability is not legitimate hardening. Additional interruption or dialog schedules must respect the stated guarantees and be validated against correct alternatives. Separate post-screening crash experiments are not additional model trials or demonstrated improvement and remain outside this publication's maintained baseline.

The capture bug was concrete: valid large streamed JSON events exceeded the old line limit. The maintained capture code now allows a bounded 4 MiB event line, with tests for both acceptance and rejection at the limit. Total capture remains bounded.

## Evidence boundary

[Sanitized records](../evidence/2026-09-07-original-five.json) distinguish the failed capture from the completed retry and preserve artifact hashes. [Maintained task](../../../tasks/browser-replay-repair/) and [batch limitations](../README.md) provide context. The reported CLI dollar estimate is not an actual subscription charge.

## 2026-09-09 — Engineering successor prepared for Trial 2

**Ready for a second exploratory Foundry trial; no second model trial has run for this version.** This section is an engineering record, not a new reward result. Priority in the next group: 2/5. See the [selection and implementation report](../next-five-implementation-plan-2026-09-09.md) and [hashed validation evidence](../evidence/2026-09-09-next-five-implementation.json). Earlier trial results and package descriptions above remain historical.

Integrated the four interruption successor scenarios (20 scenarios total), using a task-private adapter that actually ends the submitted process after a host operation commits and before its response reaches the submission. Restart preserves the real browser, storage and external effects. The public contract describes that failure boundary and redelivery without prescribing a journal design. Added a whole-trace-only memoization negative control with an ordinary non-crash witness. The reference and alternative service closures are now entirely private; the public service entry point is empty.

This version also adds a release-validator deliverable. Its raw inputs include recorded events, complete attempts and confirmation behavior; the independent private checker evaluates committed effects, order, current preconditions and reports. Real Playwright ZIP traces are retained as verifier artifacts, while archive payloads and derived correctness fields are excluded from checker input. This is a versioned task change: compare Trial 2 with the historical service-only trial accordingly.

Local validation passed 13 service-assurance checks, including correct reference and alternative services, semantic failure of the untouched starter, repeatability and negative-control activation. The independent checker correctly classified 10/10 candidates: two correct implementations and 8 negative controls, with zero false accepts or misses. The Foundry export rebuilt identically and passed fresh recipient validation. All 22 native static checks passed. These controls are author-side evidence, not model attempts or proof that an unseen solver will fail.

The earlier native browser integrity attempt timed out at 600 seconds during browser-context shutdown. The final native export adds an init process; direct integrity uses --init. The September 9 rerun passed all six controls on this exact export, including forged reward/output rejection, with the private checker correctly classifying 10/10 candidates. The earlier timeout remains development evidence. The Foundry export is unchanged. September 9 native preflight: this exact final export passed its Harbor oracle with reward 1 and nop with reward 0, with no infrastructure error. Nop rejects the missing required checker; Foundry assurance separately verifies the empty service starter fails semantically. All five packages in this group passed both native jobs. These are local checks, not Trial 2 model attempts.

Use this exact Foundry export:

- Directory: `.local/next-five-implementation-2026-09-09/release-ready/browser-replay-repair/export`
- Package digest: `ab3f64e81500aa342ff899eba2a0a9a24421345e91a78f7d900cfd044aec1d71`
- Native build, with the validation boundary above: `.local/next-five-implementation-2026-09-09/harbor-final/browser-replay-repair`
- Native digest: `87ee896596d463215fa65ca067ba308f68161a370c8154909d2b9fd08ae061d9`

Both deliverables are required. The checker must return complete deterministic Boolean verdicts; reasons are optional diagnostics and submitted helpers are available. Public API, output schemas and observable requirements remain provided, without a worked implementation.

When Trial 2 finishes, append its actual model/profile, frozen package digest, service and checker outcomes, elapsed time, infrastructure exclusions and observed submission defects here. Do not overwrite Trial 1 or count an infrastructure error, an author control or an old label dispute as a new standard model failure.

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `browser-replay-repair-attempt-1`, package digest
`ab3f64e81500aa342ff899eba2a0a9a24421345e91a78f7d900cfd044aec1d71`, route
`professional-multifile/authority-process@1`. Dispatched through the `real-provider`
execution route (signed JobStore reservation, Ed25519, realm `real-provider`,
`billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`) — a fresh
campaign slot (`attempt-1`), not an infrastructure retry. Controller:
`.local/round-two-next-five-2026-09-09/campaign.mjs`, a small, independently-verified
adaptation of the completed top-five campaign's controller; it imports the same
isolated runtime built and verified earlier (`.local/round-two-top-five-2026-09-09/frozen-source/dist/index.js`,
re-verified byte-identical immediately before this dispatch). Author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`
(`foundry-provider-agent-portfolio:2026-09-07`). Evidence retained at
`.local/round-two-next-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/browser-replay-repair-attempt-1/`.

Target: **claude**. Requested `anthropic/claude-opus-5`, effort `max`, CLI
`scaffoldVersion 2.1.263` (verified baked into the pinned author image). Observed
from runtime events: `model="claude-opus-5"` (matches requested); effort and
scaffold version are not exposed by the CLI's event stream and remain unobserved.

Dispatched 2026-09-09T13:43:45.310Z as one of five reservations installed within a
230ms window (13:43:45.249Z–13:43:45.479Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently at launch. One sibling job in this
same batch (route-policy-repair) was later interrupted by a host memory-pressure
kill of the controller process — written up separately as inconclusive — but that
had no effect on this job's own execution, which ran to a clean, valid completion.
Completed 2026-09-09T14:10:53.059Z. Total elapsed ≈1,627,749ms (~27m8s); solver
authoring time ≈1,564,889ms (~26m5s); grading ≈63s (this package's grading route
replays real browser traces, longer than the other packages' grading). CLI-reported
usage: 6,231,871 input tokens (6,072,113 cached), 127,035 output tokens; the CLI's
own `total_cost_usd` reports $7.91 — a metered-price estimate only, not an actual
charge, since billing was subscription-only with `maxMicroUsd: 0`. Execution reached
a clean `completed` state with no invalid-execution or infrastructure error.

### B. What changed since Trial 1

Most significant: **this successor adds a required, independently-graded checker**.
Trial 1 graded the service only. The starter is now a single empty `subject.run`
entry point (Trial 1's starter already supplied observation/action plumbing); the
four interruption successor scenarios and the whole-trace-only memoization control
noted in the September 9 engineering record above are part of the protected bank
this submission was graded against.

### C. Results

**Reward 1 — both required deliverables passed cleanly, the first time this
package's checker has ever been graded.** Service: all 20 expected scenarios
observed, zero failures, zero missing/unexpected IDs. Checker: `checkerRequired:
true`, `checkerPassed: true`, 10/10 candidates correctly classified — 0 missed
defects, 0 false positives. `reasonPolicy` is diagnostic-only for this package;
only the boolean verdict was graded.

### D. Observable solving behavior

21 `Bash`, 18 `Edit`, 9 `Write`, 2 `Read` tool calls captured (829 total events).
The submitted `entry.mjs` (a single 354-line `Replayer` class) is built around five
explicit invariants stated in its own header comment: receipts are the only durable
truth (every submission gated on a fresh `receipts({})` read, with the run itself
*starting* by settling to stability before that first read, so render work an
interrupted predecessor left pending becomes visible rather than silently repeated);
recorded selectors are treated as hints only — a candidate is accepted solely by
`observe`-ing it live (connected, matching entity/field), so a decoy that merely
*claims* the recorded identity in the `query` record is rejected on observation;
nothing is ever clicked without an immediately preceding `observe` confirming a
connected, ready form holding the exact recorded value, with remounts triggering a
refill; and a dialog is confirmed only after a fresh `dialog({})` read still shows
the intended entity/field/value, with an already-open dialog also checked at step
entry to recover from an interruption that ate the response to the submit that
opened it. Everything is bounded (RPC and wall-clock budgets, capped retries per
step) — its own final report notes peak observed usage of 137 RPCs against a 4,000
budget.

Per its own final summary (captured verbatim in `capture/stdout.log`), the agent
built a self-contained driver simulator before finalizing either file — injecting
decoys, moved selectors, disabled-until-settled forms, two distinct remount-timing
patterns (on-settle and immediately-after-query), stale candidates, dialogs opening
on settle, commit-on-settle, a "live twin" form that commits nothing, drifting
dialogs, and interruption injection that completes the host operation but loses the
response — then ran the service against it: **122/122 self-test scenarios**,
including a randomized flag sweep and interruptions injected at each method and at
the fill-vs-submit boundary. It self-tested the checker separately and more broadly
than the service: 244 correct cells accepted (every scenario run through two
structurally different correct implementations), 15 buggy candidate classes
rejected, 29 hand-built discrimination cases landing on the expected side, plus
explicit determinism, non-mutation (deep-frozen inputs), malformed-input and
verdict-completeness contracts. This self-testing regime is consistent with, and
plausibly explains, the clean 10/10 official checker result — unlike the
issued-report-repair (25) and incremental-build-repair (21) trials in the prior
top-five campaign, this agent's own broad self-testing did not leave an
undetected gap. The final completion claim ("both artifacts are in place... and
green across every suite I built") matches the actual grading outcome.

### E. Comparison and next step

Trial 1 reached reward 1 on the service alone (16/16, no checker requirement) after
one capture-infrastructure retry; this trial reached reward 1 on both required
deliverables from a single attempt, with the service scenario count now 20 (the
successor's four added interruption scenarios plus the memoization control) and,
for the first time, a graded standalone checker at 10/10. Starter removal does not
appear to have produced material extra difficulty here: the agent still built a
complete driver simulator and passed both deliverables cleanly. Retain this submission as a correct control and prioritize the observed reward-zero
candidates for further trials. Its broad checker self-testing is useful evidence
about why this attempt succeeded at the task; it is not a Foundry failure-finding win.

### F. Verified publication record — September 9, 2026

Reward **1**; service **20/20**; checker **10/10**. All **770** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-next-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-next-five.json). Trial 1 is preserved.
