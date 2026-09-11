# Release-validator interface

Export `run({ cases })` from `checker.mjs`; it may be asynchronous. Each case is
`{ token, cells }` and represents one candidate implementation. Each cell is an
independent execution. Accept a case exactly when every cell satisfies SEMANTICS.md.

## Cell fields

A cell now represents an entire durable installation line: ONE OR MORE successive run()
invocations (attempts) sharing the same view.storage, driven in order against the same
durable backing state, ending with the final observable outcome.

- actual: the active tree after the LAST attempt.
- initialRelease: the release id active before the FIRST attempt, or null if none.
- attempts: ordered list of every invocation, each `{attemptIndex, release, descriptors,
  blobs, cache, initial, observations, reports}`:
  - release: this attempt's view.release.
  - descriptors: this attempt's ordered pinned artifact descriptors (view.descriptors).
  - blobs: compressed origin bytes by digest available to THIS attempt, base64 encoded.
  - cache: cached compressed bytes by URL available to THIS attempt, base64 encoded. A later
    attempt's blobs/cache for the same release can be a strict subset of an earlier attempt's
    (or empty) -- sources have no retention guarantee across invocations.
  - initial: the tree that was durably active when THIS attempt began (view.initial).
  - initialStatus: `{active,staged}` release IDs at invocation entry, as returned by api.status.
  - staging: the durable staged tree when this invocation ended.
  - interruption: null, or host-recorded `{method:"finish",seq,boundary:"before"|"after"}`.
    The matching observation has interrupted:true. A before boundary leaves the attempted
    commit unlanded; an after boundary has a corresponding landed finish. This records an
    actual crash, not a candidate claim. Every non-interrupted invocation must complete its
    own requested install or unavailable result, unless that exact release was already active.
  - observations: this attempt's own cache/fetch/list/status/remove/write/finish calls and
    responses, in order.
  - reports: this attempt's own candidate-returned diagnostics.
- finishes: every finish across ALL attempts whose effect actually landed (committed) durably,
  in order, as `{attemptIndex, release, status, digests, tree}` -- `tree` is the active tree
  immediately after that finish landed. An attempt whose own finish call never landed (its
  effect was lost before commit) has no entry here, regardless of what that invocation's own
  observations show it believed happened.

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
