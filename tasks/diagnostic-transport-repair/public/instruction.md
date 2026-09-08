# Repair the diagnostic response gateway

Repair the gateway that reads multiplexed response streams and publishes one reliable
outcome for every requested job. Preserve useful response content and distinguish
successful empty results from errors and incomplete attempts. The full wire and outcome
contract is in SEMANTICS.md. Run npm test for ordinary development checks.

## Submission requires a checker

This package also requires a `checker.mjs` alongside `entry.mjs`. Grading runs your
checker against real, anonymized execution traces of several independently-produced
candidates and judges whether it correctly separates the ones that satisfy the wire and
outcome contract from the ones that violate it, naming which obligation each violator
breaks. Your checker never sees which candidate is which or any precomputed answer — only
what the traces actually show: the requested job IDs, the raw wire bytes each candidate
consumed, the rows it published, and the full API call log. A checker that only accepts
is not a checker; write one that reasons about the contract in SEMANTICS.md.

`checker.mjs` must export `run({ cases })`, where each case is `{ token, cells }` for one
candidate run against real scenarios, and return `{ verdicts: { [token]: { ok, reasons? } } }`.
When rejecting a candidate, `reasons` must name which obligation it violated, using these
exact codes — grading compares them literally, so use these strings, not a paraphrase:

- `completion` — did not exhaust the input, or the published rows don't exactly match the
  requested job population (missing, extra, or duplicate rows)
- `content` — a published row's data does not match the correct contiguous chunk prefix
- `attempt_identity` — a published row names the wrong attempt number
- `error_semantics` — a published row's status or error does not match the contract
- `exact_rows` — the full published row set does not exactly match the correct rows

Your checker is graded on real traces of a correct reference, a differently-shaped correct
alternative, and every planted defect: it must accept both correct implementations, reject
every defective one, name the violated obligation correctly each time, and be deterministic
across repeated runs.

## Exact checker schema and execution limits

Read CHECKER-INPUT.md for the complete cell schema, including original source inputs,
obligation names and the deterministic two-run execution envelope. Those source inputs
are available even when a candidate performs no reads. Judge each candidate independently.
Only checker.mjs is staged; standard Node modules are allowed, other submitted files are not.
