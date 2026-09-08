# Checker input and execution contract

Submit a standalone checker.mjs exporting run({cases}); it may be async. Each case
is {token,cells}, containing one candidate's actual executions. All source fields below
are task inputs or external observations, never supplied correctness answers.

## Cell fields

- view: {resources, tree}, the original resource catalog and full declared future tree.
- actual: ordered {after,node,resources} placement records; after is the disclosed path index.
- observations: actual next/place calls. next returns a node ID or null. Reconstruct
  disclosure and placement order from this log, not a hidden path or a supplied winning-policy answer.

Obligation names: completion, capacity_and_constraints, future_promise,
irreversible_sequence, preservation. Accept any legal promise-preserving choices.

## Common trace and output rules

Each cell also has an opaque scenarioId and reports containing untrusted diagnostics.
Observations are ordered {seq,method,request,value} records from the external host.
No top-level checks, failures, status, expected, truth or groundTruth verdict is supplied.
Nested application keys are retained even if their name resembles an oracle field.

Return {verdicts:{[token]:{ok:boolean,reasons:string[]}}} for every token. Name each
violated public obligation you identify, either alone or as "check_name: explanation".
For a rejected candidate, naming at least one public obligation that its actual trace
violates satisfies reason grading. If several obligations fail, no particular primary
label is required; a private control's authoring label is not something to guess.
Judge each candidate independently of the existence, identity or output of another.
Accept correct outputs regardless of object-key order or diagnostic report contents.

Only checker.mjs is staged. Standard Node modules are available; other submission files,
service APIs and network access are not. The runner invokes run twice on the same cases
in one process. Results must be deterministic, and inputs must not be mutated. Both
invocations combined have 60 seconds, one CPU and 1 GiB memory. Missing or malformed
checker output fails the requirement. Both the service and checker must pass.
