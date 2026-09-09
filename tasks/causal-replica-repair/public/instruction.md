# Implement offline document reconciliation

Implement document reconciliation after offline edits, preserving concurrent work and observation history without resurrecting removed versions or changing unrelated documents.

Submit `/work/task/entry.mjs` exporting `subject.run(view, api)` and
`/work/task/checker.mjs` exporting `run({ cases })`. The checker is a release
validator for other implementations: classify their recorded executions against
the same contract. Both deliverables must pass. Submitted helper modules are allowed.

The normative behavior and interfaces are in `/work/task/SEMANTICS.md`,
`/work/task/api.d.ts`, and `/work/task/CHECKER-INPUT.md`.
