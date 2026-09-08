# Repair the event-time window publisher

Repair the working stream service so downstream consumers receive complete, correctly
finalized windows and a complete late-event side output. Preserve partition identity
and the published delivery contract. Read SEMANTICS.md and api.d.ts; ordinary tests
are available with npm test. All service files may be changed.

## Checker-required submission

A submission has two parts: `entry.mjs` (the repair) and `checker.mjs`, an independently
written verifier. Grading runs your repair as usual and separately runs your checker against
several real, executed candidates -- the reference solution, a differently-shaped alternative
correct solution, and known-bad mutants -- without telling it which is which. Your checker
must judge, from real execution evidence alone, which candidates are correct.

`checker.mjs` exports `async function run({ cases })`, where each entry in `cases` is
`{ token, cells }` and each cell is one scenario's real, executed trace for that candidate:
`view` (the run's partitions/width/lateness), `actual` (the candidate's real published rows
and late events), `observations` (a full, in-order replay of every `next`/`emit`/`late` call
the candidate made), and `reports` (the candidate's own returned summary -- diagnostic only,
per SEMANTICS.md, and not authoritative on its own). No answer key is ever supplied. Return
`{ verdicts: { [token]: { ok, reasons? } } }`. When rejecting a candidate, `reasons` must name
which obligation it violated, using these codes:

- `completion` -- did not consume the full input or publish a matching count of rows
  and late events
- `window_values` -- a published window's total/count is wrong (including a real,
  zero-total accumulator that was dropped instead of published)
- `publication_boundary` -- a window was published at the wrong point in the stream (too
  early, too late, or a duplicate publication)
- `late_output` -- the late side output is incomplete, extra, or delivered at the wrong point
  (including re-reporting a duplicate of an already-classified event)
- `unique_windows` -- the same (start, key) window was published more than once

Your checker must be deterministic, must accept every genuinely correct candidate (zero false
positives), must reject every genuinely incorrect one (zero misses), and must name a correct
code for each rejection. Original event input is also supplied as specified in CHECKER-INPUT.md;
it is not a precomputed output or verdict.

## Exact checker schema and execution limits

Read CHECKER-INPUT.md for the complete cell schema, including original source inputs,
obligation names and the deterministic two-run execution envelope. Those source inputs
are available even when a candidate performs no reads. Judge each candidate independently.
Only checker.mjs is staged; standard Node modules are allowed, other submitted files are not.
