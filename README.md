# agent-eval-foundry

Build complete, fair benchmark task packages, verify them independently, and learn from preserved agent attempts.

The unit of progress is a **valid, materially distinct task package**—not a report, a parameter sweep, or an axis count. Construct strong coherent contenders; validate locally; briefly classify each authorized result; investigate promising failures and test transfers.

## What works and what remains

Twenty-five professional package source trees are maintained here: native Go/browser/persistence/budget/rollout tasks plus twenty packages covering recovery, installation, planning, reconciliation, documents, calendars, caching, streaming and more. The foundry assembles public workspaces and private validators, runs correct/incorrect controls, exports retained artifacts, and inspects immutable execution evidence.

**Latest milestone — September 9: three packages now have three consecutive recorded reward-zero results on unchanged successors.** [Trial 4](reports/screening/round-four-failing-five-2026-09-09.md) completed the third same-provider attempts for **incremental build (21), issued report (25) and variant cache (19)** with another zero each. Temporal capacity (10) returned to zero, making its record **0 → 1 → 0**. Snapshot recovery (11) passed again (**0 → 1 → 1**). All five attempts completed without infrastructure errors.

**Four packages continue under the reported 5-of-6 threshold, with 3 Claude and 3 Codex attempts per unchanged package.** The three at 3/3 need at least two failures from their three remaining attempts; temporal capacity at 2/3 needs all three. Snapshot recovery's two passes cap its six-run set at 4/6, so it is excluded from this next round. Different valid failure mechanisms can count.

[Trial 5 is prepared for those four packages with providers switched](docs/round-five-continuing-four-handoff.md): **Codex for 19, 25 and 10; Claude for 21**, one fresh attempt each, all four concurrently. This is the first of each package's three opposite-provider attempts. The exact packages and grading remain unchanged. Preparation made zero provider calls.

[Trial 2](reports/screening/round-two-portfolio-2026-09-09.md) remains **25 scored packages, 5 zeroes and 20 solver passes**. Including Trials 3 and 4, the successor record has **36 attempts: 35 scored, 12 recorded zeroes, 23 solver passes and 1 historical infrastructure interruption**, across the same 25 packages. Publication verified **28,778** manifest-listed files across the scored successor attempts, including all **4,488** Trial 4 files reverified without errors. The earlier cache matching/replacement attribution note remains documented; a repeated score does not itself resolve an earlier attribution question.

**Start with the [five-minute project status](docs/project-status.md)** for the complete package list and code links. The [screening analyses](reports/screening/README.md) preserve the original 25 results alongside subsequent trials. All 25 original service suites passed; Trial 2 adds the first recorded service-suite failure, whose public-contract attribution is still held. All 25 successors have been prepared and all five groups completed local native Harbor checks. The [final group, 23/02/10/01/22](reports/screening/round-two-final-five-2026-09-09.md), and route policy's retry are complete; every package now has a scored Trial 2 result. These are exploratory observations, not a qualified hard-task portfolio.

[Progress and decisions](docs/engineering-progress.md) connects the results to what we changed, what we rejected and what the next experiments must establish.

Twelve protected generic families remain calibration tools, not twelve additional professional deliverables. Historical discovery/scaffold commands produce drafts, not finished packages. Local controls do not prove task difficulty.

Final acceptance and the required standard/adversarial qualification runs remain pending. No package has completed the planned six-run set under the user-reported 5-of-6 threshold. Real subscription-backed screening has run through explicit authorization; local simulation commands do not dispatch providers.

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
