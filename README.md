# agent-eval-foundry

Build complete, fair benchmark task packages, verify them independently, and learn from preserved agent attempts.

**1 task meets the target of at least 5/6 failures: incremental-build-repair (21)
achieved 6/6 failures, with three Codex and three Claude attempts on the same package.**
All six services passed 27/27 scenarios. Each required checker missed the same
defect allowing publication before compiler issuance. All six recorded rewards are zero;
this result uses the original grader and requires no retroactive correction.

The unit of progress is a **valid, materially distinct task package**—not a report, a parameter sweep, or an axis count. Construct strong coherent contenders; validate locally; briefly classify each authorized result; investigate promising failures and test transfers.

## What works and what remains

Twenty-five professional package source trees are maintained here: native Go/browser/persistence/budget/rollout tasks plus twenty packages covering recovery, installation, planning, reconciliation, documents, calendars, caching, streaming and more. The foundry assembles public workspaces and private validators, runs correct/incorrect controls, exports retained artifacts, and inspects immutable execution evidence.

This is the first complete 6/6 result in the 25-package successor screening campaign.
The full set is **Codex Trials 2–4 and Claude Trials 5–7**, all fresh attempts on
unchanged task bytes. The other four finalists cannot reach 5/6 and stopped early.

[Final results](reports/screening/final-six-2026-09-09.md) ·
[Build trial analysis](reports/screening/fifth-five/21-incremental-build-repair.md) ·
[Verified evidence](reports/screening/evidence/2026-09-09-final-six.json).

The successor campaign now totals **46 attempts across 25 packages: 45 scored and
one historical infrastructure interruption**. The original grades contain **15 zero
rewards and 30 passes**. Applying the two documented historical coverage corrections
gives **17 effective failures and 28 effective passes**, covering the same 45 scored
attempts. The six new attempts contributed two failures and four passes, with no
infrastructure errors. Five unnecessary slots were left unlaunched after early stopping.

**Start with the [five-minute project status](docs/project-status.md)** for final
standings, package links and the measurement history. The
[screening index](reports/screening/README.md) preserves all 25 original trials and
subsequent attempts. All 25 successors were implemented and completed local native
Harbor checks before screening; the original and successor versions remain distinct.

[Progress and decisions](docs/engineering-progress.md) connects the results to what we changed, what we rejected and what the next experiments must establish.

Twelve protected generic families remain calibration tools, not twelve additional professional deliverables. Historical discovery/scaffold commands produce drafts, not finished packages. Local controls do not prove task difficulty.

Incremental build has completed the six-run screening target at 6/6. Final submission review and the required cheat checks remain separate. Real subscription-backed screening runs only through explicit authorization; local simulation commands do not dispatch providers.

See the [current publication report](reports/PORTFOLIO-PUBLICATION.md), [historical Phase 7 acceptance](reports/PROMPT-07-INTEGRATION.md), and [production guide](docs/professional-portfolio.md) for scoped evidence and remaining work. The [artifact policy](docs/artifact-lifecycle.md) explains what is tracked versus intentionally private.

## Start here—no credentials needed

Use the Node version in `.node-version`, pnpm from `package.json`, and fresh output directories.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test:pure
pnpm package:local learning run trials/durable-approval-outbox/cc267-claude-1
```

That inspection is read-only: it does not replay the submission or call a model. Read the [qualified outbox case](findings/README.md), including the distinction between observed zero rewards and disputed capability attribution.

To build and inspect a complete native package, start Docker and run:

```sh
pnpm package:local produce .local/caa-build .local/caa-recipient
pnpm package:local inspect .local/caa-recipient
```

First-time runtime setup downloads pinned dependencies; grading is offline. The export retains the public workspace, private validator, runtime images and local assurance. Keep recipient-only assets out of the solving workspace. [Production guide](docs/package-production.md) · [browser and other packages](docs/professional-portfolio.md).

## How it fits together

```text
professional problem → complete package → protected local controls → eligibility
                                                                  ↓ explicit authority
finding + transfer review ← read-only inspection ← immutable execution evidence
```

- [Architecture and tradeoffs](docs/architecture.md): component ownership, command boundaries, resource limits.
- [Testing and reproduction](docs/testing.md): fast checks, required container/native/browser tiers, candidate snapshots.
- [Performance](docs/performance.md): reproducible measurements, exact statistics and known scaling limits.
- [Evidence and learning](docs/evidence-learning.md): trial timelines, claim corrections, specific/conceptual transfers.
- [Historical corrections](docs/evidence-corrections.md): why older narratives are not current qualification evidence.

A fair completed-but-wrong task has a stated, attainable contract and a useful solution within a reviewed time bound. An agent may complete a substantial implementation and still omit a required invariant. Hidden data can expose that omission; hidden rules, impossible uncertainty, timeouts and broken infrastructure cannot establish capability failure. Agents are allowed to write complete self-checks.

Universal infrastructure protects validity and reproducibility. Task-specific professional obligations create the challenge. Neither a reusable template nor a local green check guarantees hardness.
