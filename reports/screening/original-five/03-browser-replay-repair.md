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
