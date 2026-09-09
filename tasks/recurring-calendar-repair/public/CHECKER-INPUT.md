# Release-validator interface

Export `run({ cases })` from `checker.mjs`; it may be asynchronous. Each case is
`{ token, cells }` and represents one candidate implementation. Each cell is an
independent execution. Accept a case exactly when every cell satisfies SEMANTICS.md.

## Cell fields

- view: original {zones, series, changes, externalBookings} input.
- actual: final committed {events, bookings}, or empty arrays if nothing was committed.
- observations: commit requests and responses, including unsuccessful calls.

## Common fields and output

Observations are ordered `{seq, method, request, value}` API-call records.
`scenarioId` and `token` are opaque identifiers. `reports` are candidate-returned
diagnostics. `executions`, when present, is execution metadata. Original input and
host-recorded effects are authoritative; no expected result or correctness verdict
is supplied. Candidates are judged independently.

Return `{verdicts: {[token]: {ok: boolean, reasons?: string[]}}}` with exactly one
verdict for every supplied token. `reasons` is optional explanatory text and does
not affect grading. Verdicts must be deterministic. Inputs must not be mutated.
The runner invokes the checker twice with the same cases; the combined budget is
60 seconds, with at least one CPU and 1 GiB memory available.

The submission workspace, including helper modules, is available during checking.
The Node 24 runtime has built-in modules. The checker must be self-contained and
work without service APIs or network access. Missing or malformed verdicts fail validation.
