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

- view: {tenant, branch, cutoff, catalog, logs}, the original recovery request.
- blobs: digest-to-base64 checkpoint bytes, available through the documented fetch API.
- actual: committed {accounts, entries, nextId}.
- publications: successful publications, each {state, archive}.
- backupError: null if an independently attempted backup restore had no error,
  otherwise an error string. No successful-restoration answer is supplied.
- observations, reports and execution metadata as described above.

## Obligations

- completion: exactly one publication, with no transaction left open.
- restored_rows: committed accounts and entries equal the selected checkpoint with
  the required transactions applied, under SEMANTICS.md.
- allocation: committed nextId matches the required allocation state.
- portable_backup: the archive identifies the requested tenant, branch and cutoff,
  restores successfully and represents the required rows and allocation.
- publication: the published state represents the requested recovery point.
- legal_operations: no state-changing operations after publication.
- preservation: unrelated stored data is unchanged. The API exposes no operation on
  unrelated tables; do not demand a particular ordering of valid recovery writes.

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
