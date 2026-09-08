# Checker input and output contract

Submit a self-contained checker.mjs exporting run({ cases }); it may be async.
Only checker.mjs is staged, with standard Node modules available, no task-specific
imports and no network access. Your repaired service may use other submitted files.

Each case is {token, cells}, containing one candidate's independent scenario runs.
A candidate passes only if all its cells satisfy the public contract. Tokens and
scenarioId values are opaque; neither carries correctness information.
Observation entries are {seq, method, request, value}: the ordered actual API calls
and their actual responses. Reports are candidate-returned diagnostics, not proof.
Execution metadata is not a grading verdict. No top-level checks, failures, status,
expected, truth or groundTruth is supplied. Application payloads are not recursively
rewritten merely because a nested key uses one of those words.

## Fields

- config: original configuration; request: original requested change.
- routes: evaluated inputs in order, each {egress, route}.
- actual: corresponding observed final decisions, or {error} on evaluation failure.
- observations: publish requests contain the submitted configuration and actual response.
- reports and execution metadata as described above.

No original interpreted decisions or expected post-change decisions are supplied.
Evaluate the original and submitted policies under SEMANTICS.md. Correct equivalent
configurations may clone, inline or reorganize nodes.

## Obligations

- completion: successful publication.
- positive_change: all requested changes to originally accepted, in-scope routes take effect.
- scoped_behavior: every in-scope route satisfies the requested behavior.
- preservation: all unaffected decisions and attributes remain unchanged.
- legal_config: published configuration respects grammar, graph and work bounds,
  and no second publication follows a successful publication.

## Output and execution

Return {verdicts: {[token]: {ok: boolean, reasons: string[]}}} for every token.
For a rejection, include each violated public obligation's exact check name, either
as a bare string or as "check_name: explanation". A correct candidate must be accepted
regardless of implementation, object-key order or unrelated diagnostic output.
Do not compare against another candidate's trace as a substitute for the contract.

The runner calls run twice with the same cases in one process. Outputs must be
identical; do not mutate inputs. The checker has 60 seconds TOTAL for both calls,
one CPU and 1 GiB memory. No service API calls are available to it. Missing,
malformed or nondeterministic output fails the checker requirement. Both the repair
and the checker must pass for overall reward one.
