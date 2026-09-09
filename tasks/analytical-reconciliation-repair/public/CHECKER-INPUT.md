# Checker input and execution contract

Submit a standalone checker.mjs exporting run({cases}); it may be async. Each case
is {token, cells}, containing one candidate's actual executions. A candidate passes
only if every cell meets the public contract. Tokens and scenarioId values are opaque.
Judge each candidate independently; another candidate's output, existence or identity
is not ground truth. All source fields below are raw task inputs, not computed answers.

## Cell fields

- view: {tenant, from, to}, the original reporting scope.
- tables: {customers, accounts, usage, credits}, arrays of original stable source rows.
  These are the rows exposed through pagination, not a joined or computed report.
- actual: the rows actually recorded by the candidate.
- observations and reports as described below.

Public obligation names: population, attribution, exact_amounts, provenance, completion,
unique_rows. Judge the required outcomes, not one particular valid pagination order.

## Common trace and output rules

Observations are ordered {seq, method, request, value} records from the external host.
Reports are candidate-reported diagnostics, not authoritative completion or correctness.
No top-level checks, failures, status, expected, truth or groundTruth verdict is supplied.
Legitimate nested application fields are not recursively removed because of their name.
Execution metadata is not a semantic verdict. Use the original input and actual effects.

Return {verdicts: {[token]: {ok: boolean, reasons?: string[]}}} for every case.
Reasons are optional diagnostics; their wording is not graded.
Accept correct alternatives regardless
of object-key ordering, equivalent operation choices or unrelated diagnostic messages.

Only checker.mjs is staged. Standard Node modules are available; other submitted files,
service APIs and network access are not. The runner calls run twice with the same cases
in one process; results must be identical and inputs must not be mutated. The combined
checker limit is 60 seconds, one CPU and 1 GiB memory. Missing, malformed or
nondeterministic output fails the checker requirement. Both deliverables must pass.
