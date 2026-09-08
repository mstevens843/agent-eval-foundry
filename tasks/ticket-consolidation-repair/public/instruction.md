# Repair cross-tenant ticket consolidation
Finish the support migration for the specified tenants and team without dropping tickets
or overwriting concurrent edits. Repair the existing paginated migration client. Keep
subject.run exported, read SEMANTICS.md and run npm test. API batches may partly succeed.

## Also required: submit a checker

Submit two files: `entry.mjs` (the repaired migration client) and `checker.mjs`. Grading
rejects a submission missing either one.

`checker.mjs` must export `run({ cases })`. `cases` is an array of `{ token, cells }`:
`token` is an opaque label, `cells` is that candidate's real observed execution trace
against this task's own scenarios — the resulting ticket rows, the selected population,
the concurrent-edit counts, the raw `api.batch`/`api.page`/`api.resolve`/`api.read` call
log, and the API observations for each scenario. You are not told which candidate is
correct. Independently judge each one from its observed behavior and return
`{ verdicts: { [token]: { ok: boolean, reasons: string[] } } }`, where a `reasons` entry
names which obligation you believe is violated, using this task's own check names:
`completion` (a selected ticket never ends up with the resolved owner and the marker
label), `ownership` (a selected ticket's owner is wrong even if labels are right),
`labels` (labels were dropped, duplicated, or a concurrent editor's label was lost),
`preservation` (status, note, revision, or an unselected/unrelated ticket was
overwritten), or `conditional_writes` (a batch update applied despite a stale revision,
or the row before an APPLIED write didn't match the request's revision).

`checker.mjs` is run twice against the same cases and must return the same verdicts both
times. It is graded against this task's own held-out reference and mutant bank: it must
accept every genuinely correct candidate and reject every genuinely broken one, or the
submission does not pass — restating the spec, or a checker that accepts everything (or
rejects everything), scores no better than chance and will not pass.
