# Do not include

The returned packet must not contain any of these artifacts or their renamed equivalents:

- hidden verifier implementation
- reference implementation
- mutant bank
- hidden scenario generator or hidden scenario set
- answer matrix
- hidden rollout/eval truth implementation
- generated foundry reports
- repository root
- private hints or author-only notes

Seeing or returning hidden artifacts contaminates the run. The packet is preserved as no-count
evidence.
