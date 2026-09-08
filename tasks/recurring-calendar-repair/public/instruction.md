# Repair recurring calendar reconciliation
The scheduling service exports event occurrences and room reservations after a set
of requested calendar changes. Repair it so the requested series and occurrence
changes are complete and unrelated scheduling information remains intact.
Read SEMANTICS.md and api.d.ts. Keep subject.run(view, api), use any correct
implementation and run npm test. This is the bounded service format, not a full
iCalendar implementation.

## Checker requirement
Submit `checker.mjs` alongside `entry.mjs`. It exports `run({cases})`, where each
case is `{token, cells}` and each cell is one scenario's real, anonymized execution
trace: the raw view the service received, its committed output, the actual API
calls observed, and any reports, with no verdict or answer key attached. Return
`{verdicts: {[token]: {ok: boolean, reasons?: string[]}}}`. Judge each candidate
independently from the trace against SEMANTICS.md; do not special-case producer
names or trace shape. When rejecting a candidate, name every violated obligation
you can identify (completion, occurrence_identity, civil_time, history, bookings,
preservation) in `reasons`. Grading requires zero false positives, zero missed
defects, the right obligation named on every correct rejection, and identical
verdicts across repeated runs. A checker that only echoes a status field or always
accepts fails grading, whatever `entry.mjs` does.

`checker.mjs` must be fully self-contained: only that single file is staged for grading, so it cannot `import` from any other submitted file (helper modules, shared utilities, or `entry.mjs` itself). Write all checking logic directly in `checker.mjs`, or duplicate any shared logic you need.
