# Release-validator interface

Export `run({ cases })` from `checker.mjs`; it may be asynchronous. Each case is
`{ token, cells }` and represents one candidate implementation. Each cell is an
independent execution. Accept a case exactly when every cell satisfies SEMANTICS.md.

## Cell fields

- input: {traceId, events, attempts, confirmation}, original recorded workflow,
  number of complete replay attempts and whether the live page requires confirmation.
- effects: committed records {traceId, step, entity, field, value, attempt, action}.
- actions: submission records {attempt, state, read, readAttempt, step}; state is the
  form at the actual click, read is its most recent observed state or null.
- An effect's action also contains confirmation when a dialog was confirmed:
  {handle, entity, field, value, generation}.
- perAttempt: committed-effect snapshots at the end of each completed replay attempt.
- reports: the service's returned replay summaries, in completed-attempt order.
- observations: actual calls and responses; interrupted:true marks a response lost
  to an injected process interruption after the host completed the operation.
- interruptions: host-recorded {attempt, method, seq} restart boundaries.
- page: final DOM serialization. Browser tracing artifacts and execution metadata
  may also be present; they carry no correctness verdict.

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
