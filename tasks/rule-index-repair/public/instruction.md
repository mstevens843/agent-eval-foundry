# Repair rule compilation

Repair the Juniper document-routing compiler. It must compile the ordered wildcard rules
into a bounded-work plan that returns exactly the required winning rule and captures.
Current callers depend on rule order, literal escapes, empty captures and case handling.
Read SEMANTICS.md and api.d.ts. The evaluator runs a documented instruction set, not
submitted JavaScript, and measures actual executed instructions. Any equivalent plan is
allowed. Run `node --test test/*.test.mjs`. Entry: subject.run(view, api).

## Also required: submit a checker

Submit two files: `entry.mjs` (the repaired compiler) and `checker.mjs`. Grading rejects
a submission missing either one.

`checker.mjs` must export `run({ cases })`. `cases` is an array of `{ token, cells }`:
`token` is an opaque label, `cells` is that candidate's real observed execution trace
against this task's own scenarios — the published program, the interpreted result and
budget/step counts for each document, and the actual API call log. You are not told
which candidate is correct. Independently judge each one from its observed behavior and
return `{ verdicts: { [token]: { ok: boolean, reasons: string[] } } }`, where a `reasons`
entry names which obligation you believe is violated (use the section of SEMANTICS.md it
violates, e.g. a wrong `captures`/`ruleId` result names the section defining match
semantics; a program that never gets published or reports failure names the completion
requirement; a program that exceeds its interpretation budget names the bounded-work
requirement).

`checker.mjs` is run twice against the same cases and must return the same verdicts both
times. It is graded against this task's own held-out reference and mutant bank: it must
accept every genuinely correct candidate and reject every genuinely broken one, or the
submission does not pass — restating the spec, or a checker that accepts everything (or
rejects everything), scores no better than chance and will not pass.
