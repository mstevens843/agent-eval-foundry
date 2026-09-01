# Verify commands

After the human produces `submission/subject.mjs`, copy the public challenge and submission into a
trial directory or external returned packet and run the normal verifier from outside the clean-room
context.

Suggested intake path:

```bash
node dist/cli.js external validate <returned-packet>
node dist/cli.js external import <returned-packet>
node dist/cli.js trials verify --family deployment-model-alias-rollout-drift <run-id>
```

The verifier output must be preserved as `verifier-output.json` and tied to the same reviewed
challenge hash.
