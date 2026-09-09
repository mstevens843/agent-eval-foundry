# Checker input and output contract

Submit checker.mjs exporting run({ cases }); it may be async. The checker executes as a
standalone Node ES module with no network access. Standard Node modules and submitted helper modules are available.

Each case is {token, cells}. Tokens and scenarioId values are opaque and carry no
correctness meaning. Cells are independent runs, not successive states of one run.
A case is correct only when every cell satisfies the task's public obligations.

Each cell includes scenarioId and observations. Observation entries are
{seq, method, request, value}: an ordered actual API call, its arguments and its
actual response. reports contains candidate-returned diagnostics, not proof of
correctness. executions contains execution metadata, not a correctness verdict.
No top-level checks, failures, status or reference answer is provided. Ignore
additional metadata fields not needed to establish a public obligation.

## Task-specific fields

- `partitions`: allowed partition IDs, as in view.partitions.
- `inputEvents`: the complete original finite event stream in delivery order, including assignments and callbacks. This is input data, not a computed expected index.
- `actual`: [key, record] pairs; key is JSON.stringify([partition, entity]).
- `checkpoints`: [partition, offset] pairs describing final durable checkpoints.
- `observations`: next/read/put/complete/commit calls with actual responses. Reconstruct intermediate ownership, index and completed-prefix state yourself; acknowledgments are not legality verdicts.

## Verdicts

Return {verdicts: {[token]: {ok: boolean, reasons?: string[]}}} for every case.
Reasons are optional diagnostics; their wording is not graded.
Accept correct alternative implementations. Do not infer correctness from token
order, scenario identifiers, reports or similarity to another candidate.

The runner invokes run twice with the same cases in the same process. Both outputs
must be identical. Do not mutate the supplied cases. The checker has 60 seconds total for both calls,
one CPU and 1 GiB memory per grading invocation. Its inputs contain a bounded bank
of finite executions governed by SEMANTICS.md; no service API calls are made by
the checker. Missing, malformed or nondeterministic checker results fail this
requirement. The repair and checker must both pass for overall reward one.
