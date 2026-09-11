# Author a runnable task

Start with [the quickstart](quickstart.md) so you have a runtime and a successful validation.
`task create` produces executable code; the older `pnpm axis scaffold` creates research
planning documents. Both are useful, but the latter is not a runnable task generator.

```sh
pnpm foundry task create my-record-task .local/my-record-task
```

Your task is a trusted authoring directory. `task build` executes its scenario generator.
Use `portfolio grade` for solver submissions; never treat submitted code as trusted task source.

## Files you own

| File | Responsibility |
| --- | --- |
| `task.json` | Task ID, family ID and version. No core registry edit is needed. |
| `public/instruction.md` | What the solver must deliver and how to run it. |
| `public/SEMANTICS.md` | Complete, public behavior contract, limits and valid alternatives. |
| `public/entry.mjs` and supporting modules | Runnable starter with a meaningful defect. |
| `public/test/*.test.mjs` | Ordinary public tests. They must accept every valid solution strategy. |
| `private/scenarios.mjs` | Deterministic `scenarios()` and the exact `checkIds` list. |
| `private/domain.mjs` | Independent API implementation, observations and grader. |
| `private/reference/entry.mjs` | Primary correct solution, overlaid on the public starter. |
| `private/alternative/entry.mjs` | Another legitimate solution strategy. |
| `private/controls/*.mjs` | Narrow, intentionally broken implementations. |
| `private/control-manifest.json` | Each control's source overlay and expected violated obligation. |

The manifest is deliberately small:

```json
{
  "schemaVersion": 1,
  "id": "my-record-task",
  "familyId": "latest-record-selection",
  "version": "0.1.0"
}
```

IDs contain lowercase letters, digits and separating hyphens. Increment the version when
you change the contract or grading behavior. Package hashes capture every built version;
editing source never changes an already exported package or its historical results.

## Make a concrete change

Try adding a public requirement that keys are case-insensitive:

1. Define the exact normalization in `SEMANTICS.md`, including the spelling to publish.
2. Add a scenario with `Alpha` and `alpha` at different revisions.
3. Update both correct implementations using different approaches.
4. Update the independent oracle without importing either implementation.
5. Add a control that handles revisions correctly but misses normalization.
6. Add at least one ordinary public example and validate the package again.

This is a suggested authoring exercise, not an existing template requirement. Do not add a
hidden check until its rule is public. Scenario quantity alone does not establish task quality.

## Service and grader interface

The subject exports `subject.run(view, api)` and returns a JSON-serializable report.
Only public input and explicit API methods cross the process boundary. The template's
domain uses the shared `session()` adapter; calls use a single object argument and are recorded.

The trusted domain exports `async runScenario(scenario, execute, storage)`. It calls
`execute(session(...))`, collects the actual operation history and returns:

```js
return {
  checks: { completion: true, key_scope: true, latest_value: false },
  failures: ["latest_value"],
  input, actual, expected, observations, reports,
};
```

Use the shared `checks({...})` helper to keep `failures` consistent with booleans.
All `checkIds` must be represented. Throwing is an invalid execution, not a substitute for
grading an ordinary incorrect answer. Inspect the operation history when ordering matters.

## Test both sides

Correct references and alternatives must pass every scenario. A negative control must
execute cleanly and fail at least one scenario on its declared check. An optional `clean`
scenario proves the control can still solve a case unaffected by its defect. For example:

```json
{
  "id": "stale-value",
  "overlay": { "entry.mjs": "controls/stale-value.mjs" },
  "check": "latest_value",
  "clean": "empty"
}
```

Also keep the template's isolation control. The primary reference, alternative, untouched
starter, controls, visible tests and repeatability checks all contribute separate evidence.
Investigate a rejected valid alternative instead of automatically making the grader stricter.

## Build, validate, export

Assuming the runtime from the quickstart is available:

```sh
pnpm foundry task build .local/my-record-task .local/my-record-build .local/quickstart/runtime
pnpm foundry portfolio validate .local/my-record-build .local/my-record-validation
pnpm foundry portfolio export .local/my-record-build .local/my-record-export .local/my-record-validation/assurance.json
```

The manifest-based build uses the same assembly, protected runtime, grader and export path
as maintained Node packages. It does not add the task to screening statistics. Validation
is necessary before trials, but it does not establish hardness, independent review or readiness
for a particular benchmark destination.

## Requiring a solver-written checker

The introductory template requires a service only. Existing maintained tasks also require
a standalone checker. Before adding this deliverable, study `public/CHECKER-INPUT.md`,
`private/checker-required.json`, the checker/reference files and positive variants in
`tasks/incremental-build-repair/`, plus `src/packages/checker-contract.ts`.
Specify the checker's input and output publicly, keep authoritative verdicts out of its
input, and test both missed defects and false positives. Do not copy a large checker task
without understanding its additional contract.

For contribution review and measured-trial requirements, see [CONTRIBUTING.md](../CONTRIBUTING.md).
