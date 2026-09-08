# Repair the incremental artifact builder

Repair the service that produces current, compiler-attested release artifacts across
successive build requests. Preserve dependency provenance and useful cache reuse within
the published build-call budgets. Read SEMANTICS.md and api.d.ts; run npm test for
ordinary checks. This is a build-service repair, not an installation or rollout task.

## Checker requirement
Submit `checker.mjs` alongside `entry.mjs`. It exports `run({cases})`, where each
case is `{token, cells}` and each cell is one scenario's real, anonymized execution
trace: the round-by-round build requests it actually received, its committed
publications and compile-call counts, the actual API calls observed, and any reports,
with no verdict or answer key attached. Return `{verdicts: {[token]: {ok: boolean,
reasons?: string[]}}}`. Judge each candidate independently from the trace against
SEMANTICS.md and api.d.ts; do not special-case producer names or trace shape. When
rejecting a candidate, name every violated obligation you can identify (completion,
current_artifacts, publication_scope, incremental_budget) in `reasons`. Grading
requires zero false positives, zero missed defects, the right obligation named on
every correct rejection, and identical verdicts across repeated runs. A checker that
only echoes a status field or always accepts fails grading, whatever `entry.mjs` does.

`checker.mjs` must be fully self-contained: only that single file is staged for grading, so it cannot `import` from any other submitted file (helper modules, shared utilities, or `entry.mjs` itself). Write all checking logic directly in `checker.mjs`, or duplicate any shared logic you need.

