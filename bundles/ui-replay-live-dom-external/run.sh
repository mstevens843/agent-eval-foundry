#!/usr/bin/env bash
# Run this trial. Produced by `foundry trials campaign prepare`.
#
# The command below is EXACTLY what the foundry would run for this provider. Run it with this
# directory as the working directory; the model must write submission/subject.mjs.
# Then hand the whole directory back to `foundry trials campaign import`.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p submission

# No CLI is declared for this provider. Give INSTRUCTION.txt to the model however you run it,
# and save its answer to submission/subject.mjs.
