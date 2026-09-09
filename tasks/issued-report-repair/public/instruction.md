# Implement issued-report amendments

Implement the product-quality reporting service. Corrected measurements must propagate to current reports and affected recipients while preserving issued history and historical-version answers.

Submit `/work/task/entry.mjs` exporting `subject.run(view, api)` and
`/work/task/checker.mjs` exporting `run({ cases })`. The checker is a release
validator for other implementations: classify their recorded executions against
the same contract. Both deliverables must pass. Submitted helper modules are allowed.

The normative behavior and interfaces are in `/work/task/SEMANTICS.md`,
`/work/task/api.d.ts`, and `/work/task/CHECKER-INPUT.md`.
