# Verify commands

From the foundry repo root, after the returned packet is complete:

```bash
node dist/cli.js external validate bundles/deployment-model-alias-rollout-drift-external
node dist/cli.js external import bundles/deployment-model-alias-rollout-drift-external
```

A valid completed packet may then be re-graded and written into `trials/`. A refusal,
infrastructure error, stale hash, contamination, missing transcript, missing submission, missing
verifier output, or hidden artifact leak is preserved but never counted.
