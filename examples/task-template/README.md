# Latest-record task template

This is a small executable authoring example. It has no measured model trials and is
not part of the 25-package screening portfolio. Its purpose is to teach the package interface.

The subject reads records and publishes the latest revision for each key. The
starter works on sorted input but fails when an older revision arrives later.
Two independent correct implementations and narrow negative controls exercise the grader.

Create your editable copy with `pnpm foundry task create my-task .local/my-task`.
That command adds `task.json`. Follow [the authoring guide](https://github.com/mstevens843/agent-eval-foundry/blob/main/docs/task-authoring.md)
to change the contract, scenarios, references and controls, then build, validate and export.
This template uses a service deliverable; adding a solver-written checker is an advanced task option.
