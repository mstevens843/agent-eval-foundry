# Repair release installation

Repair Meridian's offline release installer. It must consume the pinned release descriptors
and publish the intended executable tree, preserving file contents, directory boundaries
and permissions. If no verified copy of a required artifact is available, leave the active
installation unchanged.
Use SEMANTICS.md and api.d.ts; no live registry is required. Any equivalent implementation
is allowed, including constructing a complete replacement tree.
Run `node --test test/*.test.mjs`. Entry: subject.run(view, api).

## Also required: submit a checker

Submit two files: `entry.mjs` (the repaired installer) and `checker.mjs`. Grading rejects a
submission missing either one.

`checker.mjs` must export `run({ cases })`. `cases` is an array of `{ token, cells }`:
`token` is an opaque label, `cells` is that candidate's real observed execution trace against
this task's own scenarios — for each scenario, the tree actually left in place, the
independently computed expected tree, every `finish` call the candidate made, and the full API
call log (`cache`/`fetch`/`list`/`remove`/`write`/`finish` requests and responses). You are not
told which candidate is correct. Independently judge each one from its observed behavior and
return `{ verdicts: { [token]: { ok: boolean, reasons: string[] } } }`, where a `reasons` entry
names which obligation you believe is violated (use the section of SEMANTICS.md it violates,
e.g. an active tree that doesn't match the required content or permissions names `contents`; a
release that installs when it should have been declared unavailable, or vice versa, names
`availability`; committed digests that don't match descriptor order names `commitment`; a
program that never calls `finish` exactly once, or fabricates a result without calling it at
all, names `completion`).

`checker.mjs` is run twice against the same cases and must return the same verdicts both times.
It is graded against this task's own held-out reference and mutant bank: it must accept every
genuinely correct candidate and reject every genuinely broken one, or the submission does not
pass — restating the spec, or a checker that accepts everything (or rejects everything), scores
no better than chance and will not pass.
