# Repair the resource release reconciler
Bring a partially applied resource graph to its requested release without breaking dependency
ordering or disturbing other applications. Repair the functioning release client. Preserve
entry.mjs's subject.run interface, read SEMANTICS.md, and run npm test.

## Also required: submit a checker

Submit two files: `entry.mjs` (the repaired release client) and `checker.mjs`. Grading rejects
a submission missing either one.

`checker.mjs` must export `run({ cases })`. `cases` is an array of `{ token, cells }`:
`token` is an opaque label, `cells` is that candidate's real observed execution trace against
this task's own scenarios — the final resource graph, the requested target, the sequence of
create/remove operations attempted (each with whether it was accepted), and the raw API
observation log. You are not told which candidate is correct. Independently judge each one from
its observed behavior and return `{ verdicts: { [token]: { ok: boolean, reasons: string[] } } }`,
where a `reasons` entry names which obligation you believe is violated (use the section of
SEMANTICS.md it violates, e.g. a final graph where a scoped ID's presence or absence doesn't
match its target names the completion requirement; a surviving resource whose payload or parent
set doesn't match its target names the payload requirement; an operation attempted before its
ordering was satisfied — for instance a parent removed while a still-referencing child was still
present — names the dependency_order requirement; a change reaching an unrelated resource or a
write outside view.scope names the preservation requirement).

`checker.mjs` is run twice against the same cases and must return the same verdicts both times.
It is graded against this task's own held-out reference and mutant bank: it must accept every
genuinely correct candidate and reject every genuinely broken one, or the submission does not
pass — restating the spec, or a checker that accepts everything (or rejects everything), scores no
better than chance and will not pass.
