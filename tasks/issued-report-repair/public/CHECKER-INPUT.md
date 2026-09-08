# Checker input and execution contract

Submit a standalone checker.mjs exporting run({cases}); it may be async. Each case
is {token,cells}, containing one candidate's actual executions. All source fields below
are task inputs or external observations, never supplied correctness answers.

## Cell fields

- input: {definitions, readings, initial, steps}. Definitions/readings are original source
  facts; initial is the legitimate entry {history,receipts}; steps contain the ordered
  source changes, requests and queries. These are raw inputs, not expected amendments.
- actual: {publications,deliveries,answers,history}. Output records include after,
  the zero-based source step at publication. History includes initial and appended records.
- observations: actual next/snapshot/publish/deliver/answer requests and responses.

Obligation names: completion, amendment_content, issued_history, recipient_scope, historical_answers.
Accept independent output order and correct alternative snapshot/read strategies.

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
