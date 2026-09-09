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
