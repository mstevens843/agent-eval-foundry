# Release-validator interface

Export `run({ cases })` from `checker.mjs`; it may be asynchronous. Each case is
`{ token, cells }` and represents one candidate implementation. Each cell is an
independent execution. Accept a case exactly when every cell satisfies SEMANTICS.md.

## Cell fields

- input: {definitions, readings, initial, steps}. Definitions/readings are original source
  facts; initial is the legitimate entry {history,receipts}; steps contain the ordered
  source changes, requests and queries. These are raw inputs, not expected amendments.
- actual: {publications,deliveries,answers,history}. Output records include after,
  the zero-based source step at publication. History includes initial and appended records.
- observations: actual next/snapshot/publish/deliver/answer requests and responses.

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
