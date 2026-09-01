#!/usr/bin/env bash
# Run this trial. Produced by `foundry trials campaign prepare`.
#
# The command below is EXACTLY what the foundry would run for this provider. Run it with this
# directory as the working directory; the model must write submission/subject.mjs and submission/checker.mjs.
# Then hand the whole directory back to `foundry trials campaign import`.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p submission

'claude' \
  '--model' \
  'haiku' \
  '-p' \
  'You are attempting a benchmark task. Your working directory contains:
  challenge/   — read this. README.md explains the task, SPEC.md is the normative contract.
  submission/  — write your answer here.

Read challenge/README.md and challenge/SPEC.md in full, then implement both artifacts they
describe:
  submission/subject.mjs   exporting `subject` with runSession(view, memory, tools)
  submission/checker.mjs   exporting `checker` with run({ cases, runCase, makeCase })

The checker must invoke runCase and validate observed traces independently. A subject-only
submission is incomplete.

Do not modify anything in challenge/. Write exactly those two files under submission/.' \
  '--permission-mode' \
  'bypassPermissions'
