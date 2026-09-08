# Repair offline document reconciliation
The document service must reconcile replicas after offline edits without resurrecting deleted
versions or erasing concurrent work. Repair the public service and retain subject.run.
Read SEMANTICS.md and run npm test. You may replace modules and use any valid merge strategy.

## Also required: submit a checker

Submit two files: `entry.mjs` (the repaired reconciliation service) and `checker.mjs`.
Grading rejects a submission missing either one.

`checker.mjs` must export `run({ cases })`. `cases` is an array of `{ token, cells }`:
`token` is an opaque label, `cells` is that candidate's real observed execution trace
against this task's own scenarios — the reconciled document state actually written to
every replica, the original per-replica document snapshots, requested replica/document
scope, and actual read/replace API observations. No precomputed converged result or
grader verdict is supplied. CHECKER-INPUT.md specifies the exact fields.
You are not told which candidate is correct. Independently
judge each one from its observed behavior and return `{ verdicts: { [token]: { ok:
boolean, reasons: string[] } } }`, where a `reasons` entry names which obligation you
believe is violated (use this task's own check names from SEMANTICS.md: a wrong set of
surviving edits or payloads names `causal_values`; a wrong observation clock (context)
names `causal_context`; a replica left unreconciled, or a document that never converges,
names `completion`; a write outside the requested document scope, or a corrupted
untouched document, names `preservation`).

`checker.mjs` is run twice against the same cases and must return the same verdicts both
times. It is graded against this task's own held-out reference and mutant bank: it must
accept every genuinely correct candidate and reject every genuinely broken one, or the
submission does not pass — restating the spec, or a checker that accepts everything (or
rejects everything), scores no better than chance and will not pass.
