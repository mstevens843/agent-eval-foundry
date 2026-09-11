# Agent Eval Foundry

A task-production system for building, testing, and improving benchmarks that expose gaps in coding agents.

**Use it:** [Quickstart](docs/quickstart.md) · [Create a task](docs/task-authoring.md) · [Replay a checker defect](examples/replays/premature-publication/README.md) · [Run one model trial](docs/first-model-trial.md) · [Contribute](CONTRIBUTING.md)

**25 task packages screened. Twelve tasks meet the ≥5/6 failure target: ten at 6/6 and two at 5/6.**

## Measured results

**72 counted finalist trials: 70 reward=0 and two reward=1.** Each task has three Codex and three Claude trials. Reward=0 means the agent failed a required deliverable; producing valid failures is the task-authoring objective.

| Task and full trial history | Reward=0 / counted trials | Codex reward=0 | Claude reward=0 |
| --- | ---: | ---: | ---: |
| [03 — Browser replay](reports/screening/original-five/03-browser-replay-repair.md) | **6/6** | 3/3 | 3/3 |
| [04 — Delegated budget](reports/screening/original-five/04-delegated-budget-repair.md) | **6/6** | 3/3 | 3/3 |
| [05 — Compatible rollout](reports/screening/original-five/05-compatible-rollout-repair.md) | **6/6** | 3/3 | 3/3 |
| [12 — Verified installation](reports/screening/third-five/12-verified-installation-repair.md) | **6/6** | 3/3 | 3/3 |
| [13 — Capacity maintenance](reports/screening/third-five/13-capacity-maintenance-repair.md) | **6/6** | 3/3 | 3/3 |
| [18 — Recurring calendar](reports/screening/fourth-five/18-recurring-calendar-repair.md) | **6/6** | 3/3 | 3/3 |
| [19 — Variant cache](reports/screening/fourth-five/19-variant-cache-repair.md) | **6/6** | 3/3 | 3/3 |
| [20 — Workflow authority](reports/screening/fourth-five/20-workflow-authority-repair.md) | **6/6** | 3/3 | 3/3 |
| [21 — Incremental build](reports/screening/fifth-five/21-incremental-build-repair.md) | **6/6** | 3/3 | 3/3 |
| [25 — Issued report](reports/screening/fifth-five/25-issued-report-repair.md) | **6/6** | 3/3 | 3/3 |
| [10 — Temporal capacity](reports/screening/next-five/10-temporal-capacity-repair.md) | **5/6** | 2/3 | 3/3 |
| [11 — Snapshot recovery](reports/screening/third-five/11-snapshot-recovery-repair.md) | **5/6** | 3/3 | 2/3 |

**Three new 6/6 results:** Compatible rollout, Verified installation and Capacity maintenance bring the 6/6 total from seven to ten.

**[Results and counting method](reports/screening/final-results-2026-09-11.md)** · [Machine-readable evidence](reports/screening/evidence/2026-09-11-twelve-finalists.json) · [All 25 task histories](reports/screening/README.md)

Public task contracts remained fixed within each finalist's repeated trial set. The evidence preserves original rewards, documented regrades, excluded attempts and fresh trials. The totals above cover the twelve qualifying sets; exploratory and excluded attempts remain in the campaign histories.

Partial release was solved; its audited valid passes remain counted. Ticket consolidation is outside the qualifying total: three historical counted failures, with physical attempts 4–7 excluded as audited nulls. Its [corrected v2.0.5 package](reports/pass-audits/ticket-consolidation-attempt-seven-2026-09-11.md) is prepared for further trials. The [successor campaign checkpoint](reports/screening/successor-results-2026-09-11.md) retains its earlier scope through Ticket attempt 6 and separates those outcomes, the recovered grading incident and the original controller error. Route policy's earlier 3/5 result also remains outside the qualifying sets.

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

The 25 maintained packages cover builds, caches, databases, reports, routing, calendars, browser interaction, deployment, and other engineering problems. All 25 successors completed local native oracle/nop checks. Twelve tasks now meet the screening target across both providers. The remaining 13 retain their screening results and development histories.

## Review the project

| Start here | What it shows |
| --- | --- |
| [Final results](reports/screening/final-results-2026-09-11.md) | Twelve completed six-run sets, per-provider results, and exact counting |
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

For a complete first run with expected outputs, follow the [0.2.0 quickstart](docs/quickstart.md).
It covers a runnable template, grading, standalone exports and recipient reproduction with no model calls.
`pnpm foundry --help` lists the developer commands; `pnpm axis` retains historical research commands.
The [source release guide](docs/releases.md) explains versioned candidates and verification.

## Reading the evidence

Most finalist failures concern the agent's **required checker**, even when its service implementation passes. A checker that accepts an invalid execution or rejects a valid one fails that deliverable. The final results report explains the concrete defects and preserves original grades, cumulative grading corrections, and excluded grading voids and infrastructure interruptions.

The reported ≥5/6 target is the acceptance criterion communicated for this screening program. These are completed standard screening results; destination-specific review and adversarial qualification are separate. Requested model settings and observed provider identities are distinguished in the campaign evidence.

The earlier [Durable Approval Outbox case](findings/README.md) and twelve generic calibration families remain separately documented; they are outside these twelve finalist results. [Historical evidence corrections](docs/evidence-corrections.md) explain the scope of those older records.
