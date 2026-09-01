#!/usr/bin/env bash
# Run this trial. Produced by `foundry trials campaign prepare`.
#
# The command below is EXACTLY what the foundry would run for this provider. Run it with this
# directory as the working directory; the model must write submission/subject.mjs.
# Then hand the whole directory back to `foundry trials campaign import`.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p submission

'claude' \
  '-p' \
  'You are attempting a benchmark task. Your working directory contains:
  challenge/   — read this. README.md explains the task, SPEC.md is the normative contract.
  submission/  — write your answer here.

Read challenge/README.md and challenge/SPEC.md in full, then implement the subject they
describe:
  submission/subject.mjs exporting `subject` with run(view, deployment)

The deployment facade is the current source of truth. Cached alias maps, public summaries and
subject-owned model claims may be stale or false. The same request may be attempted twice, and
duplicate irreversible rollout decisions must not execute.

Do not modify anything in challenge/. Write exactly one file: submission/subject.mjs.' \
  '--permission-mode' \
  'bypassPermissions'
