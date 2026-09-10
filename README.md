# Agent Eval Foundry

A task-production system for building, testing, and improving benchmarks that expose gaps in coding agents.

**25 task packages screened. Five finalists meet the reported ≥5/6 failure target: three at 6/6 and two at 5/6.**

## Measured results

The five completed sets contain **30 counted trials: 28 reward=0 outcomes and two reward=1 outcomes**. Each package has three Codex and three Claude trials. Here, **reward=0 means the agent failed a required deliverable**; producing those valid failures is the task-authoring objective.

| Task package and trial history | Reward=0 / counted trials | Codex trials | Claude trials |
| --- | ---: | ---: | ---: |
| [21 — Incremental build](reports/screening/fifth-five/21-incremental-build-repair.md) | **6/6** | 3 | 3 |
| [25 — Issued report](reports/screening/fifth-five/25-issued-report-repair.md) | **6/6** | 3 | 3 |
| [19 — Variant cache](reports/screening/fourth-five/19-variant-cache-repair.md) | **6/6** | 3 | 3 |
| [11 — Snapshot recovery](reports/screening/third-five/11-snapshot-recovery-repair.md) | **5/6** | 3 | 3 |
| [10 — Temporal capacity](reports/screening/next-five/10-temporal-capacity-repair.md) | **5/6** | 3 | 3 |

**[Read the final results and counting method](reports/screening/final-results-2026-09-09.md)** · [Machine-readable results](reports/screening/evidence/2026-09-09-final-results.json) · [All 25 task histories](reports/screening/README.md)

These results came from **54 successor attempts across 25 packages**, following the original 25-package screening. Fifty successor trials count; three grading voids and one infrastructure interruption are retained separately. Public task contracts stayed fixed during each finalist's repeated trials. Grading corrections and fresh trials are documented alongside the original results.

## What the Foundry does

The project explores a practical question: how do you produce many useful benchmark tasks through a repeatable engineering process?

```text
Build candidates → Validate contracts and controls → Screen agents
        ↑                                                ↓
Improve packages ← Analyze preserved attempts ← Repeat promising candidates
```

- **Build complete packages.** Assemble public instructions, starter workspaces, private references, graders, and native Harbor exports.
- **Validate before spending on trials.** Check correct alternatives, deliberately broken implementations, verifier isolation, oracle success, and untouched-starter failure.
- **Run controlled campaigns.** Use frozen package versions, independent solver workspaces, provider assignments, resource budgets, and concurrent execution.
- **Learn from actual attempts.** Preserve submissions and execution manifests, investigate failures, repair missing grading coverage, and record each iteration in the original task history.

The 25 maintained packages cover builds, caches, databases, reports, routing, calendars, browser interaction, deployment, and other engineering problems. All 25 successors completed local native oracle/nop checks. The five finalists demonstrate repeated failures across both providers; the other 20 provide useful screening and selection evidence.

## Review the project

| Start here | What it shows |
| --- | --- |
| [Final results](reports/screening/final-results-2026-09-09.md) | Five completed six-run sets, per-provider results, and exact counting |
| [Project status and portfolio](docs/project-status.md) | All 25 source packages, implementation coverage, and evidence links |
| [Engineering progress](docs/engineering-progress.md) | Decisions, unsuccessful hypotheses, grading repairs, and measured improvement |
| [Architecture](docs/architecture.md) | Package assembly, execution lifecycle, isolation, and retained evidence |
| [Production strategy](docs/100K-TASK-PRODUCTION-STRATEGY.md) | Candidate selection, screening, and the proposed path to larger-scale production |

## Verify locally

Use the Node version in `.node-version` and the pnpm version in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
pnpm test:pure
node scripts/verify-publication.mjs
```

These checks require no model credentials or paid provider calls. The publication verifier checks evidence identities, trial accounting, provider balance, and navigation using tracked files.

For Docker, browser, native execution, full tests, and report reproduction, follow the [testing guide](docs/testing.md). To assemble and inspect a task, follow the [package production guide](docs/package-production.md). The [artifact policy](docs/artifact-lifecycle.md) explains why raw solver captures and runtime archives remain private while sanitized evidence and source are tracked.

## Reading the evidence

Most finalist failures concern the agent's **required checker**, even when its service implementation passes. A checker that accepts an invalid execution or rejects a valid one fails that deliverable. The final results report explains the concrete defects and preserves original grades, cumulative grading corrections, and the three excluded grading voids.

The reported ≥5/6 target is the acceptance criterion communicated for this screening program. These are completed standard screening results; destination-specific review and adversarial qualification are separate. Requested model settings and observed provider identities are distinguished in the campaign evidence.

The earlier [Durable Approval Outbox case](findings/README.md) and twelve generic calibration families remain separately documented; they are outside these five finalist results. [Historical evidence corrections](docs/evidence-corrections.md) explain the scope of those older records.
