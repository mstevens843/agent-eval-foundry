# Repair staged allocation

Repair the allocator that accepts staged resource requests while honoring the full
published capacity promise. A locally valid acceptance must leave the remaining promised
work feasible. Preserve prior bookings and complete each disclosed request. Read the
bounded contract and run npm test; every correct allocation strategy is allowed.

## Submit a checker alongside the repair

This package also requires `checker.mjs` next to `entry.mjs`. It must export
`run({ cases })`, where each case is `{ token, cells }` for one candidate implementation
run against real scenarios, and return `{ verdicts: { [token]: { ok, reasons? } } }`.
Judge each candidate independently from its own observed behavior alone: each cell
carries `view` (the real resource catalog and node constraint tree that candidate was
given — tags, zone, capacity, and each node's units/tags/minZones/antiWith/
shareZoneWith), `actual` (the placements it really published, in order), `observations`
(a full, in-order replay of every `next`/`place` call it made and what each call
returned), and `reports` (its own returned summary — diagnostic only, per SEMANTICS.md,
not authoritative on its own; some candidates fabricate a plausible-looking report while
doing none of the required work). Never rely on any field named `expected`, `truth` or
`groundTruth` — those are stripped before your checker ever sees a case. Every rejection
must name which obligation was violated, using these codes: `completion`,
`capacity_and_constraints`, `future_promise`, `irreversible_sequence`, `preservation`.
Your checker is graded on real traces of a correct reference, a differently-shaped
correct alternative, and every planted defect: it must accept both correct
implementations, reject every defective one, name the violated obligation correctly each
time, and be deterministic across repeated runs. A checker that only accepts, or that
merely diffs a candidate's trace shape against another candidate's, is not a checker.

## Exact checker schema and execution limits

Read CHECKER-INPUT.md for the complete cell schema, including original source inputs,
obligation names and the deterministic two-run execution envelope. Those source inputs
are available even when a candidate performs no reads. Judge each candidate independently.
Only checker.mjs is staged; standard Node modules are allowed, other submitted files are not.
