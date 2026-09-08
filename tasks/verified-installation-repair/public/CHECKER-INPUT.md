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

- descriptors: original ordered pinned artifact descriptors.
- initial: the previously active filesystem tree.
- blobs: compressed origin bytes by digest, base64 encoded.
- cache: cached compressed bytes by URL, base64 encoded.
- actual: the active tree after execution.
- finishes: successful finish records {status, digests, tree}.
- observations: cache/fetch/list/remove/write/finish requests and actual responses.
- reports and execution metadata as described above.

The two byte maps describe available inputs, not the resulting installation.
Reconstruct availability and layer application using SEMANTICS.md. A valid
implementation may consult cache first or origin first; no particular access order
or gratuitous cache call is required.

## Obligations

- completion: exactly one successful finish.
- availability: installed if every layer has a verified available copy, unavailable otherwise.
- contents: active files and metadata equal the requested layered tree, or initial
  when installation is unavailable.
- commitment: installed digests match descriptor order.
- atomicity: unavailable installation leaves the active tree unchanged.
- legal_operations: no state-changing operation after successful finish.

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
