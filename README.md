# agent-eval-foundry

Build complete, fair benchmark task packages, verify them independently, and learn from preserved agent attempts.

**Three finalists have completed the reported ≥5/6 failure target: two at 6/6 and
one at 5/6. Two finalists await three fresh Codex replacements.** The latest audit
confirmed three more false passes. At the user's request those three are unscored,
with their raw records and diagnostic regrades preserved. Earlier agreed regrades
remain counted.

The unit of progress is a **valid, materially distinct task package**—not a report, a parameter sweep, or an axis count. Construct strong coherent contenders; validate locally; briefly classify each authorized result; investigate promising failures and test transfers.

## What works and what remains

Twenty-five professional package source trees are maintained here: native Go/browser/persistence/budget/rollout tasks plus twenty packages covering recovery, installation, planning, reconciliation, documents, calendars, caching, streaming and more. The foundry assembles public workspaces and private validators, runs correct/incorrect controls, exports retained artifacts, and inspects immutable execution evidence.

| Package | Counted failures / trials | Status | Remaining provider slots |
| --- | --- | --- | --- |
| **21 Incremental build** | **6/6** | Complete; meets ≥5/6 | None |
| **25 Issued report** | **6/6** | Complete; meets ≥5/6 | None |
| **10 Temporal capacity** | **5/6** | Complete; meets ≥5/6 | None |
| 19 Variant cache | **4/4** | Pending; T6/T7 grading voids | Codex T8 and T9 |
| 11 Snapshot recovery | **4/5** | Pending; T4 grading void | Codex T8 |

The new audit found that cache Trials 6/7 reject a legitimate tier copy, and snapshot
Trial 4 rejects a valid empty recovery without a database commit. It also repaired
missing private verification of metadata after a 304 validation. Snapshot Trial 7
and temporal Trial 7 survived the broader checks and remain passes.

Verification covered **24 retained submissions, 50/50 private-oracle classifications,
29 passing-service replays, and 20,836 original files verified before and after with
zero drift**. No additional model calls were made. Agent-visible packages remain
unchanged; fresh replacements receive cumulative checker and service grading.

There are **51 successor attempts across 25 packages**, with 50 completed raw grades
and one historical infrastructure interruption. The current selected record contains
**47 counted trials: 25 failures and 22 passes**, plus three grading voids awaiting
replacement. Original grades remain visible (15 zeroes, 35 passes); audit findings
are retained separately. We do not count a void as a failure or silently erase it.

[Latest audit](reports/screening/remaining-pass-audit-2026-09-09.md) ·
[Counting disposition](reports/screening/evidence/2026-09-09-three-replacement-disposition.json) ·
[Three-replacement handoff](docs/three-replacements-handoff.md).

The completed sets have three counted Codex and three counted Claude attempts. The
remaining slots restore that balance for cache and snapshot. The reported ≥5/6
screening target remains separate from final rubric and adversarial qualification.

**Start with the [five-minute project status](docs/project-status.md)** for current
standings, package links and the measurement history. The
[screening index](reports/screening/README.md) preserves all 25 original trials and
subsequent attempts. All 25 successors were implemented and completed local native
Harbor checks before screening; the original and successor versions remain distinct.

[Progress and decisions](docs/engineering-progress.md) connects the results to what we changed, what we rejected and what the next experiments must establish.

Twelve protected generic families remain calibration tools, not twelve additional professional deliverables. Historical discovery/scaffold commands produce drafts, not finished packages. Local controls do not prove task difficulty.

Three finalists have completed the reported six-run screening target; two await replacement trials. Final submission review and the required cheat checks remain separate. Real subscription-backed screening runs only through explicit authorization; local simulation commands do not dispatch providers.

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
