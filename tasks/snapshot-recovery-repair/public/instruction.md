# Recover the archive service

Repair the Northstar archive coordinator. It must publish a usable portable backup and
restore the requested database point into a fresh instance. Existing clients rely on
account relationships, exact entry values and continuing ID allocation after recovery.
Other tenants' data must remain unchanged.

Read SEMANTICS.md and api.d.ts. The service is split across catalog selection, recovery,
backup serialization and restoration. You may change any submitted implementation and
use an equivalent design. Run `node --test test/*.test.mjs`.
Entry point: exported subject.run(view, api) in entry.mjs.
The target expert repair budget is 2–3 hours; the execution envelope is separate.

## Also required: submit a checker

Submit two files: `entry.mjs` (the repaired coordinator) and `checker.mjs`. Grading rejects
a submission missing either one.

`checker.mjs` must export `run({ cases })`. `cases` is an array of `{ token, cells }`:
`token` is an opaque label, `cells` is that candidate's real observed execution trace
against this task's own scenarios — the restored database state, original recovery inputs
and checkpoint bytes, backup restoration errors, publications, and the actual API call log.
No expected result is supplied. See CHECKER-INPUT.md for the complete trace contract.
You are not told which candidate is correct.
Independently judge each one from its observed behavior and return
`{ verdicts: { [token]: { ok: boolean, reasons: string[] } } }`, where a `reasons` entry
names which obligation you believe is violated, using this task's own check vocabulary
(the public names defined in CHECKER-INPUT.md, e.g. `completion`, `restored_rows`,
`allocation`, `portable_backup` — restored rows or allocation state that don't match the
independently derived expected state name the recovery/replay requirement; a portable
backup that doesn't decode, or decodes to something other than the expected state, names
the backup requirement; a program that never publishes, or reports success without ever
publishing, names the completion requirement).

`checker.mjs` is run twice against the same cases and must return the same verdicts both
times. It is graded against this task's own held-out reference and mutant bank: it must
accept every genuinely correct candidate and reject every genuinely broken one, or the
submission does not pass — restating the spec, or a checker that accepts everything (or
rejects everything), scores no better than chance and will not pass.
