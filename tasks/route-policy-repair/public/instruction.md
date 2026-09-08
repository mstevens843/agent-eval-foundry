# Repair scoped route-policy changes

Repair Aster's configuration change service. Apply the requested export preference change
while preserving every other routing decision and attribute. Policies are shared between
egresses and may invoke other policies. Publish a complete valid configuration, not a
simulation report or blanket refusal.
Read SEMANTICS.md and api.d.ts. Equivalent configurations and non-minimal changes are allowed.
Run `node --test test/*.test.mjs`. Entry: subject.run(view, api).

## Also required: submit a checker

Submit two files: `entry.mjs` (the repaired configuration-change service) and `checker.mjs`.
Grading rejects a submission missing either one.

`checker.mjs` must export `run({ cases })`. `cases` is an array of `{ token, cells }`:
`token` is an opaque label, `cells` is that candidate's real observed execution trace against
this task's own scenarios — the published configuration, the interpreted per-route decision for
each document, and the actual API call log. You are not told which candidate is correct.
Independently judge each one from its observed behavior and return
`{ verdicts: { [token]: { ok: boolean, reasons: string[] } } }`, where a `reasons` entry names
which obligation you believe is violated (use the section of SEMANTICS.md it violates, e.g. a
route in the request's scope that doesn't finish accepted with the requested preference and
otherwise-unchanged attributes names the match-scoping requirement, `scoped_behavior`; a rejected
route, an out-of-scope route, or a nonrequested egress that doesn't retain exactly its original
decision and attributes names the preservation requirement, `preservation`; a configuration that
never gets published, or whose publish attempt itself doesn't report success, names the
completion requirement, `completion`; an in-scope accepted route whose requested preference
change never actually took effect names the positive-change requirement, `positive_change`; a
route evaluation that surfaces a work-limit or validation failure instead of a decision, or a
second publish attempt after one already succeeded, names the configuration-legality
requirement, `legal_config`).

`checker.mjs` is run twice against the same cases and must return the same verdicts both times.
It is graded against this task's own held-out reference and mutant bank: it must accept every
genuinely correct candidate and reject every genuinely broken one, or the submission does not
pass — restating the spec, or a checker that accepts everything (or rejects everything), scores
no better than chance and will not pass.
