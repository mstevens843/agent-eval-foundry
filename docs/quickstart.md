# Run your first Foundry task

This walkthrough accompanies Foundry **0.2.0**. It creates a small task, proves that
its grader accepts correct alternatives and rejects broken implementations, and
exports a package another developer can validate. It makes **zero model calls**.

## Prerequisites

- Node **22.22.1**, matching `.node-version`.
- pnpm **10.33.0**, matching `package.json`.
- Docker with a working daemon for task execution. Node alone runs the recorded replay.
- Approximately **4 GiB** free for this example, plus Docker image storage. The full
  25-package integration suite has a separate storage budget in [testing.md](testing.md).

The runtime supports the platform of the Docker image you build. Exports retain that
platform and image digest; an ARM image is not automatically an x86 image. The maintained
CI runs Linux, and the developer walkthrough also runs on macOS with Docker Desktop.

## Install and inspect

```sh
git clone https://github.com/mstevens843/agent-eval-foundry.git
cd agent-eval-foundry
npm install --global pnpm@10.33.0
pnpm install --frozen-lockfile
pnpm build
pnpm foundry --help
pnpm foundry portfolio list
```

Use the `v0.2.0` tag when available to select the version described here; `main` continues
to evolve. See [releases.md](releases.md) for the release checks and source-bundle workflow.
The list contains 25 maintained tasks. New tutorial tasks do not change that inventory.
`pnpm package:local` is an equivalent entry point; `pnpm axis` retains historical research commands.

Before Docker setup, you can reproduce a published checker defect:

```sh
pnpm replay:example
```

Expect `reproduced: true`: the retained checker accepts an invalid premature publication,
while the frozen temporal oracle rejects it and accepts two valid executions. Read
[the replay's scope and provenance](../examples/replays/premature-publication/README.md).

## Prepare the runtime

```sh
pnpm foundry doctor
docker build --provenance=false -t foundry-portfolio-runtime:v1 tasks/portfolio-runtime
pnpm foundry doctor
pnpm foundry portfolio runtime .local/quickstart/runtime
```

Doctor checks Node, pnpm, Docker access, cached runtime and workspace space. Missing runtime
images produce a setup warning; missing required tooling produces a nonzero exit. It never
downloads dependencies. The explicit Docker build may download its pinned dependencies.
Runtime capture records the exact image digest and creates `runtime.tar` for offline validation.

## Create, build and validate a task

```sh
pnpm foundry task create latest-record-demo .local/quickstart/source
pnpm foundry task build .local/quickstart/source .local/quickstart/build .local/quickstart/runtime
pnpm foundry portfolio validate .local/quickstart/build .local/quickstart/validation
```

Expect **10 assurance results**, all `pass`, and `decision.stages.local-valid.allowed: true`.
The template includes a reference, a valid alternative, the starter, five negative controls,
a public-test smoke check and a repeated reference run. A negative control's `pass` means
the grader correctly rejected its defect. The template has no model-hardness claim.

Every output directory must be new. If `.local/quickstart` already contains a run, use a
different parent such as `.local/quickstart-2` throughout the commands. Preserve failed
runs: their `assurance.json` and logs explain what went wrong.

## Observe the defect, then repair the submission

The starter picks the last record in input order, even when it has an older revision.
Its ordinary public test passes, but protected reordered-input cases fail:

```sh
node --test .local/quickstart/source/public/test/example.test.mjs
pnpm foundry portfolio grade .local/quickstart/build .local/quickstart/source/public .local/quickstart/starter-grade
```

Inspect `starter-grade/result.json`: some cells are `semantic-fail` with `latest_value`.
`grade` can exit zero after successfully recording a semantic failure; inspect the result,
not just the shell exit code. `validate` exits nonzero when any required assurance operation fails.

For a known-correct repair, copy the supplied alternative into a separate submission:

```sh
cp -R .local/quickstart/source/public .local/quickstart/repaired
cp .local/quickstart/source/private/alternative/entry.mjs .local/quickstart/repaired/entry.mjs
pnpm foundry portfolio grade .local/quickstart/build .local/quickstart/repaired .local/quickstart/repaired-grade
```

Every repaired service cell should be `semantic-pass`. This deliberately uses a different
solution strategy from the primary reference. Follow [task-authoring.md](task-authoring.md)
to write your own contract, scenarios and controls.

## Export and hand it to someone else

```sh
pnpm foundry portfolio export .local/quickstart/build .local/quickstart/export .local/quickstart/validation/assurance.json
cd .local/quickstart/export
node package/tooling/local-cli.mjs doctor --package .
node package/tooling/local-cli.mjs portfolio load-runtime .
node package/tooling/local-cli.mjs portfolio validate . recipient-check
```

Expect the same ten assurance checks to pass. The exported README has these instructions.
A recipient needs Node, Docker and the export directory; they do not need your checkout,
`node_modules`, credentials or private model archives. Only `visible/public/` belongs in a
solver workspace. The reference and private grader remain recipient-only.

For one of the maintained tasks, use `portfolio build ID BUILD RUNTIME` in place of
`task create`/`task build`. Native Go CAA uses the [native production guide](package-production.md).
For an actual subscription agent attempt, continue to [first-model-trial.md](first-model-trial.md).

## Verify this walkthrough automatically

From the repository root after building and preparing the Docker image:

```sh
pnpm test:onboarding .local/onboarding-check-1
```

This exercises task creation outside the registry, validation, broken and correct submissions,
export, recipient validation from another working directory, frozen replay and trial planning.
It records `summary.json` and per-step logs. It never executes a real provider trial.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `dist/...` missing | Run `pnpm build` from the repository root. |
| Docker socket permission denied or daemon unavailable | Start Docker and grant the invoking process daemon access; rerun `doctor`. |
| Runtime image missing | Run the Docker build above; recipients use `portfolio load-runtime`. |
| `OUTPUT_EXISTS` | Use a new output directory and retain the existing evidence. |
| `PORTFOLIO_LOCAL_ASSURANCE_FAILED` | Open the named receipt and its failed result details. Identify infrastructure errors before investigating semantic failures. |
| Unknown task ID | Run `portfolio list`; custom sources use `task build`, not `portfolio build`. |
| Reference or valid alternative rejected | Investigate the contract/grader before running models. See the authoring guide. |
