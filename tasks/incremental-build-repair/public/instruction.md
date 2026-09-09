# Implement the incremental artifact builder

Implement a build service that publishes current compiler-attested release artifacts across successive requests, preserving dependency provenance and useful cache reuse within each build-call budget.

Submit `/work/task/entry.mjs` exporting `subject.run(view, api)` and
`/work/task/checker.mjs` exporting `run({ cases })`. The checker is a release
validator for other implementations: classify their recorded executions against
the same contract. Both deliverables must pass. Submitted helper modules are allowed.

The normative behavior and interfaces are in `/work/task/SEMANTICS.md`,
`/work/task/api.d.ts`, and `/work/task/CHECKER-INPUT.md`.
