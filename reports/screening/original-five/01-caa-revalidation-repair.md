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
