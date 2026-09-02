# Targeted Development Gates

Full reproducibility remains the release gate, but it is too expensive to run after every small
change. During implementation, use the smallest deterministic command that covers the code touched,
then run the full gate at the end of a release checkpoint.

## Provider Delta

Use these when changing deployment-alias provider-delta logic:

- `pnpm typecheck`
- `pnpm exec vitest run test/provider-delta.test.ts`
- `pnpm exec vitest run test/provider-delta-diagnosis.test.ts`
- `pnpm exec vitest run test/deployment-alias-family.test.ts`
- `pnpm build`
- `node dist/cli.js deployment-alias readiness --out reports`
- `node dist/cli.js provider-delta report --out reports/deployment-model-alias-rollout-drift-provider-delta.md`
- `node dist/cli.js provider-delta diagnosis --out reports/deployment-model-alias-rollout-drift-provider-delta-diagnosis.md`
- `node dist/cli.js provider-delta evolution --out reports/deployment-model-alias-rollout-drift-evolution-options.md`
- `node dist/cli.js family diagnose --family deployment-model-alias-rollout-drift --out reports/deployment-model-alias-rollout-drift-agent-diagnosis.md`
- `node dist/cli.js lineage report --out reports/lineage-learning-report.md`

These commands do not replace the release gate. They only keep iteration cheap while preserving the
same generated artifacts for the touched surface.

## Mechanism Probes

Use these when changing executable discovery probes or probe-to-task-shape routing:

- `pnpm typecheck`
- `pnpm exec vitest run test/probe-runner.test.ts`
- `pnpm exec vitest run test/provider-delta-diagnosis.test.ts`
- `pnpm build`
- `node dist/cli.js probes report --out reports/mechanism-probe-report.md`
- `node dist/cli.js probes scaffold --probe provider-failover-router-alias-drift-probe --out examples/probes/provider-failover-router-alias-drift`
- `node dist/cli.js provider-delta evolution --out reports/deployment-model-alias-rollout-drift-evolution-options.md`

Probe evidence is local executable routing evidence. It does not replace full-family local evidence
or any counted model trial.

## External Evidence

Use these when preparing or checking third-party packets:

- `node dist/cli.js external packet --family deployment-model-alias-rollout-drift --provider claude --out bundles/deployment-model-alias-rollout-drift-claude`
- `node dist/cli.js external validate <returned-packet>`
- `node dist/cli.js external import <returned-packet>`
- `node dist/cli.js trials verify --family deployment-model-alias-rollout-drift <run-id>`

Do not treat packet preparation as evidence. Only a returned packet with current hash, metadata,
transcript, submission and verifier output can count.

## Prose

Use these when editing `README.md`, `MEMO.md` or `docs/*.md`:

- `pnpm freshness`

`README.md`, `MEMO.md` and `docs/*.md` are the only files here that a human types numbers into.
Everything under `reports/` is regenerated and diffed, so a generated number cannot silently drift;
a number retyped into prose can, and an audit found two dozen that had. `pnpm freshness` runs
`test/prose-freshness.test.ts`, which takes well under a second because it only reads files, and
which checks three things:

1. every challenge hash quoted in prose is a hash some family **currently** produces — not merely
   one that some report still mentions, because the superseded-trial tables name replaced hashes on
   purpose;
2. claims that require counted trials are absent from prose while the family's generated
   agent-results report says it has none — these rules arm and disarm from the report, so a real
   new result makes them stop applying rather than needing an edit here;
3. the short list of figures prose still quotes equals what the generating report says today.

It is not a general fact-checker and is not meant to be. Most figures were deleted from prose and
replaced with a link to the report, because a number that is not written down cannot drift. When
rule 3 fails, deleting the sentence is usually the better repair than renumbering it — and when
rule 2 fails, renumbering is the wrong repair by definition: a corrected number attached to a
withdrawn claim is still a false claim.

This check also runs inside `pnpm test`, so it gates every commit that runs the tests.

## Release Gate

Run the full gate only at an end-of-day/release checkpoint or when explicitly requested:

- `pnpm test`
- `node dist/cli.js all`
- `pnpm verify`

`pnpm verify` takes over ten minutes, which is why it is **not** in `pnpm test`. It runs on every
push and pull request instead, in `.github/workflows/verify.yml`, where nobody has to remember it.
A ten-minute local gate is a gate people route around; the split is by cost, not by importance.
