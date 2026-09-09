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

The native browser integrity attempt timed out at 600 seconds with an infrastructure error during browser-context shutdown after the reference, alternative and one negative control passed. The final native export adds an init process to reap orphaned browser processes; the direct integrity command also uses --init. This is a suspected fix, with a Docker rerun pending while the first group occupies the host. It does not change the separately validated Foundry export. All five native Harbor end-to-end oracle/nop jobs remain pending; this does not prevent using the validated Foundry path for exploratory trials.

Use this exact Foundry export:

- Directory: `.local/next-five-implementation-2026-09-09/release-ready/browser-replay-repair/export`
- Package digest: `ab3f64e81500aa342ff899eba2a0a9a24421345e91a78f7d900cfd044aec1d71`
- Native build, with the validation boundary above: `.local/next-five-implementation-2026-09-09/harbor-final/browser-replay-repair`
- Native digest: `87ee896596d463215fa65ca067ba308f68161a370c8154909d2b9fd08ae061d9`

Both deliverables are required. The checker must return complete deterministic Boolean verdicts; reasons are optional diagnostics and submitted helpers are available. Public API, output schemas and observable requirements remain provided, without a worked implementation.

When Trial 2 finishes, append its actual model/profile, frozen package digest, service and checker outcomes, elapsed time, infrastructure exclusions and observed submission defects here. Do not overwrite Trial 1 or count an infrastructure error, an author control or an old label dispute as a new standard model failure.
