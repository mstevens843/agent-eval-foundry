# Targeted Development Gates

Full reproducibility remains the release gate, but it is too expensive to run after every small
change. During implementation, use the smallest deterministic command that covers the code touched,
then run the full gate at the end of a release checkpoint.

## Provider Delta

Use these when changing deployment-alias provider-delta logic:

- `pnpm typecheck`
- `pnpm exec vitest run test/provider-delta.test.ts`
- `pnpm exec vitest run test/deployment-alias-family.test.ts`
- `pnpm build`
- `node dist/cli.js deployment-alias readiness --out reports`
- `node dist/cli.js provider-delta report --out reports/deployment-model-alias-rollout-drift-provider-delta.md`
- `node dist/cli.js family diagnose --family deployment-model-alias-rollout-drift --out reports/deployment-model-alias-rollout-drift-agent-diagnosis.md`
- `node dist/cli.js lineage report --out reports/lineage-learning-report.md`

These commands do not replace the release gate. They only keep iteration cheap while preserving the
same generated artifacts for the touched surface.

## External Evidence

Use these when preparing or checking third-party packets:

- `node dist/cli.js external packet --family deployment-model-alias-rollout-drift --provider claude --out bundles/deployment-model-alias-rollout-drift-claude`
- `node dist/cli.js external validate <returned-packet>`
- `node dist/cli.js external import <returned-packet>`
- `node dist/cli.js trials verify --family deployment-model-alias-rollout-drift <run-id>`

Do not treat packet preparation as evidence. Only a returned packet with current hash, metadata,
transcript, submission and verifier output can count.

## Release Gate

Run the full gate only at an end-of-day/release checkpoint or when explicitly requested:

- `pnpm test`
- `node dist/cli.js all`
- `pnpm verify`
