# Repair the historical capacity reporting service
Operations needs reproducible capacity exposure reports at an effective-time range and a
knowledge-time cutoff. Repair this original reporting service. Keep entry.mjs exporting
subject.run(view, api). You may change any public code and add modules. Run npm test.
SEMANTICS.md is normative. Exact arithmetic and complete report population matter.

## Also required: submit a checker

Submit two files: `entry.mjs` (the repaired reporting service) and `checker.mjs`. Grading
rejects a submission missing either one.

`checker.mjs` must export `run({ cases })`. `cases` is an array of `{ token, cells }`:
`token` is an opaque label, `cells` is that candidate's real observed execution trace
against this task's own scenarios — the queries it was asked to answer, the API call log
(the fetched revision pages and report rows recorded), and the original raw revision
records. No expected totals or grader verdict is supplied. Reconstruct the required
results from the public contract. CHECKER-INPUT.md specifies the exact fields.
You are not told which candidate is correct. Independently
judge each one from its observed behavior and return
`{ verdicts: { [token]: { ok: boolean, reasons: string[] } } }`, where a `reasons` entry
names which obligation you believe is violated (use this package's own check names from
SEMANTICS.md: a wrong report total names `exact_integral`; a report row for a query that
was never asked, or a missing/wrong-shaped row, names `population`; more than one report
row for the same query id names `unique_reports`; a candidate that never records a report
for a requested query names `completion`).

`checker.mjs` is run twice against the same cases and must return the same verdicts both
times. It is graded against this task's own held-out reference and mutant bank: it must
accept every genuinely correct candidate and reject every genuinely broken one, or the
submission does not pass — restating the spec, or a checker that accepts everything (or
rejects everything), scores no better than chance and will not pass.
