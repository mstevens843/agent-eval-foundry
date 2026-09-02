# Run instructions: deployment-model-alias-rollout-drift

1. Give the model or reviewer only this directory, especially the public `challenge/` folder.
2. Ask for a solution at `submission/subject.mjs` following `SUBMISSION_TEMPLATE.md`.
3. Save the complete interaction in `transcript.txt` or `transcript.json`.
4. Fill in `metadata.json`. Keep the pinned hash and scenario set unchanged.
5. Run the verifier from the foundry repo, outside this packet, and save output to `verifier-output.json`.
6. Return the entire packet for intake.

Suggested verification from the foundry repo:

```bash
node dist/cli.js external validate <returned-packet>
node dist/cli.js external import <returned-packet>
```

The verifier output must be tied to the same `runId` as `metadata.json`, for example:

```json
{
  "runId": "deployment-model-alias-rollout-drift-claude-EDITME",
  "challengeHash": "805efb58c923f9e081db1b41967392d7",
  "cells": []
}
```
