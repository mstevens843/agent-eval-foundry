# Checker input and output contract

Submit checker.mjs exporting run({ cases }); it may be async. The checker executes as a
standalone Node ES module with no task-specific imports or network access. Standard
Node modules are available. Keep its implementation self-contained in checker.mjs.

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

- `requestedScope` and `requestedTarget`: the original view.scope and view.target.
- `initialResources`: the original resource array before execution.
- `actual`: the final resource array.
- `operations`: create/remove attempts as {method, args, before, valid, scope}; before is the resource array immediately preceding the attempt. valid/scope are host annotations; the raw observations and before-state also permit independently evaluating the rules.
- `observations`: inspect/create/remove/receipt calls with their actual responses.
Resource parent lists are sets. A correct final state does not excuse illegal intermediate requests; any legal planning or uncertainty-resolution strategy is accepted.

## Verdicts

Return {verdicts: {[token]: {ok: boolean, reasons: string[]}}} for every case.
For a rejected case, reasons must include the public check name of the violated
obligation; the names and their meanings are listed in instruction.md.
Accept correct alternative implementations. Do not infer correctness from token
order, scenario identifiers, reports or similarity to another candidate.

The runner invokes run twice with the same cases in the same process. Both outputs
must be identical. Do not mutate the supplied cases. The checker has 60 seconds total for both calls,
one CPU and 1 GiB memory per grading invocation. Its inputs contain a bounded bank
of finite executions governed by SEMANTICS.md; no service API calls are made by
the checker. Missing, malformed or nondeterministic checker results fail this
requirement. The repair and checker must both pass for overall reward one.
