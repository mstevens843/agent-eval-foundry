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

## Exact checker schema and execution limits

Read CHECKER-INPUT.md for the complete cell schema, including original source inputs,
obligation names and the deterministic two-run execution envelope. Those source inputs
are available even when a candidate performs no reads. Judge each candidate independently.
Only checker.mjs is staged; standard Node modules are allowed, other submitted files are not.
