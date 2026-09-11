# Replay: a checker accepts publication before compilation

From the repository root, run:

```sh
node examples/replays/premature-publication/replay.mjs
```

Node 22.22.1 is sufficient. This example needs no install, build, Docker, credentials or model calls.
It also runs from another working directory using the script's absolute path.

Expected output: `reproduced: true`. The submitted checker accepts all three traces.
The ordering oracle accepts `reference` and `alternative` and rejects `premature-publication`.
Exit zero means the documented **checker defect was reproduced**, not that the invalid service passed.

## What is preserved

- `frozen/submitted-checker.mjs` is the unchanged checker from the first recorded
  incremental-build submission. Its hash matches the public trial's submitted-file manifest.
- `frozen/cases.json` contains three real, model-free Docker traces for `case-024`:
  a reference, a valid alternative, and the deliberately broken premature-publication control.
  They were captured on September 11, not during the original model attempt. Only the scenario,
  input, actual output, observations and reports are included; no private transcripts or credentials.
- `frozen/ordering-oracle.mjs` checks the specific temporal obligation independently of
  the submitted checker. It is a small replay oracle, not the full production grader.
- `provenance.json` records source evidence, package identity, scope and expected outcomes.
- `SHA256SUMS.json` pins the fixture, checker, oracle and provenance. Changes to the
  current task or optimized grader do not silently change this example.

## Why it fails

The bad trace publishes `built-1` at sequence 2. The compiler returns `built-1` at
sequence 3. The final artifact dump looks correct, but the handle did not exist at
publication time. The submitted checker validates against that final dump and misses
the temporal violation. Both legitimate traces remain accepted by the replay oracle.

This reproduces one finding from the [task history](../../../reports/screening/fifth-five/21-incremental-build-repair.md).
It does not rerun the model, reproduce all six counted trials, or establish new task hardness.
For full current package validation, follow [the quickstart](../../../docs/quickstart.md).
