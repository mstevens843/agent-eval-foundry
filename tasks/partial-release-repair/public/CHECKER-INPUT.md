# Release-validator interface

Export `run({ cases })` from `checker.mjs`; it may be asynchronous. Each case is
`{ token, cells }` and represents one candidate implementation. Each cell is an
independent execution. Accept a case exactly when every cell satisfies SEMANTICS.md.

## Cell fields

- requestedScope and requestedTarget: original scope and target resource array.
- initialResources: resource array before execution.
- actual: final resource array.
- operations: create/remove attempts as {method, args, before}; before is the
  complete resource array immediately preceding the attempt.
- observations: actual inspect/create/remove/receipt calls and responses.
  Resource arrays and parent sets have no significant ordering. Every resource inside an
  inspect response, and every DONE receipt response for a create token, additionally
  carries a server-assigned generation number (see SEMANTICS.md). A caller may also supply
  an ignored generation in a create request: that value remains visible in
  operations[].args.resource and the corresponding observation request, and must not
  affect content equality or request legality. Stored actual and operations[].before
  contain no generation. The provided initialResources and requestedTarget use the plain
  {id,parents,payload} shape. Final correctness is fully
  determined from actual/operations/before exactly as for every other field, and a checker
  is not required to inspect generation to grade correctly.

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
