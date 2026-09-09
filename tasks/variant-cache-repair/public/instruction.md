# Implement the edge and shield cache service

Implement response reuse across two edge caches and a shared shield, including conditional validation and scoped purges. Meet the supplied origin-load budgets while preserving unaffected cache content.

Submit `/work/task/entry.mjs` exporting `subject.run(view, api)` and
`/work/task/checker.mjs` exporting `run({ cases })`. The checker is a release
validator for other implementations: classify their recorded executions against
the same contract. Both deliverables must pass. Submitted helper modules are allowed.

The normative behavior and interfaces are in `/work/task/SEMANTICS.md`,
`/work/task/api.d.ts`, and `/work/task/CHECKER-INPUT.md`.
