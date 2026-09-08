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

- view: original {hosts, services, placement, requests, dependencies}.
- actual: final {placement, done}.
- history: {placement, done} after each successful state-changing API operation.
  No precomputed capacity, availability or placement verdict is included.
- observations, reports and execution metadata as described above.

Compute intermediate invariants from original requirements and actual state
transitions. Placement-array order is not identity; correct plans need not match
another candidate's sequence.

## Obligations

- completion: each requested host upgraded exactly once, honoring dependencies,
  followed by successful finish.
- capacity: weighted occupancy never exceeds any host's capacity.
- availability: every service's instance count satisfies min/max at every step.
- placement: eligibility and per-zone limits hold at every step.
- restoration: final placement equals original placement.
- legal_operations: no rejected, invalid or post-finish operation.

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
