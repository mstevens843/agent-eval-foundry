# Repair the partitioned search index consumer
The indexing service consumes asynchronously completed batches while partition ownership
can change. Repair indexing and checkpoint recovery together. Keep subject.run exported,
use the existing service API, read SEMANTICS.md, and run npm test.

## Also required: submit a checker

Submit two files: `entry.mjs` (the repaired consumer) and `checker.mjs`. Grading rejects
a submission missing either one.

`checker.mjs` must export `run({ cases })`. `cases` is an array of `{ token, cells }`:
`token` is an opaque label, `cells` is that candidate's real observed execution trace
against this task's scenarios: the final index state, durable checkpoints, allowed
partitions, original input events, and raw ordered API request/response observations.
No expected index, expected checkpoint, operation-legality annotation or grader verdict
is supplied. Derive correctness from the public contract and these observations.
CHECKER-INPUT.md specifies the exact fields. You are not
told which candidate is correct. Independently judge each one from its observed behavior
and return `{ verdicts: { [token]: { ok: boolean, reasons: string[] } } }`, where a
`reasons` entry names which obligation you believe is violated (use the section of
SEMANTICS.md it violates, e.g. a final index missing the expected highest-version record,
or a put whose written body doesn't match a genuinely delivered event, names the
index_payload requirement; a put that writes a lower record.version over an already-durable
higher version names the version_order requirement; any operation issued for a partition or
generation that wasn't currently authorized names the ownership requirement; a commit or
complete that wasn't legal at the moment it was issued — skipping or regressing the
checkpoint, or completing before its effect was durable — names the checkpoint_prefix
requirement; an operation touching a partition outside view.partitions names the
preservation requirement; a run that never reaches the required checkpoint on every
partition, or leaves a delivered position uncompleted, names the completion requirement).

`checker.mjs` is run twice against the same cases and must return the same verdicts both
times. It is graded against this task's own held-out reference and mutant bank: it must
accept every genuinely correct candidate and reject every genuinely broken one, or the
submission does not pass — restating the spec, or a checker that accepts everything (or
rejects everything), scores no better than chance and will not pass.
