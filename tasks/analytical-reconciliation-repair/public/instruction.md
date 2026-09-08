# Repair the customer usage reconciliation service
Finance needs a reproducible customer report assembled from the account catalog,
metering revisions and independently issued credits. Repair the service to produce
every required row, with correct attribution, quantities and amounts.
SEMANTICS.md and api.d.ts define the complete contract. Keep subject.run(view, api);
any correct architecture is allowed. Run npm test.

## Checker required
This package also requires a checker. Submit `checker.mjs` alongside `entry.mjs`,
exporting `run({cases})`. Each case is `{token, cells}`, one cell per graded scenario,
each carrying that run's `view`, `actual` rows and the real `observations` (every
`fetch`/`record` call the candidate made, including the raw fetched rows) — never a
precomputed answer. Return `{verdicts: {[token]: {ok, reasons?}}}`: `ok:false` for any
candidate that violates the contract, with `reasons` naming which obligation from
SEMANTICS.md it violates (population, attribution, exact_amounts, provenance,
completion or unique_rows). Your checker is graded independently, against the real
reference, a real alternative implementation and the private mutant bank: it must
have zero false positives, zero missed defects, name the right obligation on every
rejection, and be deterministic. An entry.mjs that semantically passes is not enough
without a checker.mjs that clears this bar.

`checker.mjs` must be fully self-contained: only that single file is staged for grading, so it cannot `import` from any other submitted file (helper modules, shared utilities, or `entry.mjs` itself). Write all checking logic directly in `checker.mjs`, or duplicate any shared logic you need.

## Exact checker schema and execution limits

Read CHECKER-INPUT.md for the normative raw input fields, independent-candidate
judging rule, reason format and checker runtime envelope. It supplements the domain
contract in SEMANTICS.md; no answer key or other candidate's output is needed.
