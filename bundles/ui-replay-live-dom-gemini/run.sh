#!/usr/bin/env bash
# Run this trial. Produced by `foundry trials campaign prepare`.
#
# The command below is EXACTLY what the foundry would run for this provider. Run it with this
# directory as the working directory; the model must write submission/subject.mjs.
# Then hand the whole directory back to `foundry trials campaign import`.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p submission

gemini \
  "--approval-mode" \
  "yolo" \
  "-p" \
  "You are attempting a benchmark task. Your working directory contains:\n  challenge/   — read this. README.md explains the task, SPEC.md is the normative rules.\n  submission/  — write your answer here.\n\nRead challenge/README.md and challenge/SPEC.md in full, then implement the subject they describe\nand write it to submission/subject.mjs as an ES module exporting `subject` with a\nreplay(trace, app) method.\n\nThe live app is DOM-like, mutable, and deterministic. Replay must not call a model. It may be\ncalled twice with the same trace, and irreversible effects must not repeat.\n\nDo not modify anything in challenge/. Write exactly one file: submission/subject.mjs."
