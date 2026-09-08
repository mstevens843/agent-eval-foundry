# Repair the support-record exporter
The support team needs complete, privacy-filtered exports that remain useful to their
downstream archive. Repair this service so every requested ticket is published with
the content and relationships required by SEMANTICS.md and the supplied policy.
Keep entry.mjs exporting subject.run(view, api). You may change any public code,
add modules and use standard libraries. Run npm test. Do not change the external API.

## You must also submit a checker
This package requires an independent checker alongside the repair. Submit both
entry.mjs (your repair) and checker.mjs at the top level. checker.mjs must export
`async function run({ cases })`, where each case is `{ token, cells }` — a real,
executed trace of one candidate implementation against a held-out set of scenarios,
identified only by an opaque token (you are not told which candidate is which, or
how many are correct). Each cell gives you `policy` (the redaction policy in force,
the same shape as view.policy), `actual` (the real decoded document that candidate
published), `observations` (the real, host-recorded sequence of read/publish calls
it made, including the raw ticket content and the raw published payload), and
`reports` (that candidate's own self-reported diagnostics — these are not verified
by anything and must not be trusted on their own). You are not given any precomputed
answer key; judge correctness the same way you would verify any other export, using
SEMANTICS.md and the policy actually in force for each scenario.
Return `{ verdicts: { [token]: { ok: boolean, reasons?: string[] } } }`. Accept every
genuinely correct candidate and reject every genuinely defective one; for each
rejection, name which obligation it violates using the public names
completion, privacy, preservation, identity and unique_publication.
Your checker is graded for zero false positives, zero missed defects, correctly
named rejections and determinism (it is run twice and must agree with itself). A
missing, stub, or always-accepting checker fails this requirement outright,
regardless of how good the repair itself is.

`checker.mjs` must be fully self-contained: only that single file is staged for grading, so it cannot `import` from any other submitted file (helper modules, shared utilities, or `entry.mjs` itself). Write all checking logic directly in `checker.mjs`, or duplicate any shared logic you need.

## Exact checker schema and execution limits

Read CHECKER-INPUT.md for the normative raw input fields, independent-candidate
judging rule, reason format and checker runtime envelope. It supplements the domain
contract in SEMANTICS.md; no answer key or other candidate's output is needed.
