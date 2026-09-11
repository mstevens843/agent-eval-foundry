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

- `initialRows`: original snapshot rows; `allowedTenants`: view.tenants.
- `requestedTeam`, `requestedMarker`: the original task parameters.
- `directory`: authoritative target-owner IDs by allowed tenant for requestedTeam, available through api.resolve during execution.
- `actual`: final ticket rows.
- `edits`: [JSON.stringify([tenant,id]), count] pairs for injected concurrent edits. Each edit adds concurrent-N to labels, sets note to edited-N and increments revision, starting N at zero. These are external edit facts, not candidate verdicts.
- `concurrentStatusFlips`: {tenant, id, status} entries recording a selected row whose status was externally forced away from "open" mid-run. Like `edits`, this is an external fact, not a candidate verdict: the row remains part of the frozen migration population and must still be fully migrated, and its final `status` in `actual` is expected to equal the forced value here rather than its original snapshot value. Absent an entry for a row, its expected final status is unchanged from `initialRows`.
- `calls`: batch-row observations {request, before, status}; before includes any concurrent edit (and any concurrent status flip) immediately before evaluating the conditional update.
- `observations`: page/resolve/read/batch calls and their actual responses; an entry may carry `interrupted:true`, meaning its effect landed on the backing rows but the response was lost to the candidate process before delivery (see `interruptions`).
- `interruptions`: {method, seq} entries recording each host-injected lost-response boundary (at most one per cell); `seq` matches the interrupted entry in `observations`. The identical run continues in a fresh process against the already-mutated backing rows — the same requirement as any other repeated/redelivered call: already-correct rows need no further write, and every row in the frozen selection must still end up correctly migrated regardless of which process attempt actually did the work.
- `execution`: host-recorded process outcome `{outcome:"returned"|"threw"}`. An unhandled
  execution error invalidates the run even if all requested writes landed before it.
  This is a process fact, not a semantic verdict. Host-injected, recovered interruptions
  do not count as an unhandled error.
- `invalidExecution`: optional diagnostic error text; wording carries no correctness meaning.
- `operationCount`, `operationBudget`: cumulative host operation count and the cap supplied
  to the candidate as view.operationBudget. A count above the cap is invalid, even if the
  requested final rows were already correct when the extra operation was attempted.
Already-correct work does not require redundant reads or writes. Judge required outcomes and permitted mutations, not one implementation's call pattern.

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
