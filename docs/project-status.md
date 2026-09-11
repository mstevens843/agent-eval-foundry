# Project status

September 11, 2026. **Twelve qualifying tasks: ten at 6/6 reward=0 and two at 5/6.** Compatible rollout, Verified installation and Capacity maintenance add three completed 6/6 results.

## Completed screening results

| Task and full trial history | Reward=0 / counted trials | Codex reward=0 | Claude reward=0 |
| --- | ---: | ---: | ---: |
| [03 — Browser replay](../reports/screening/original-five/03-browser-replay-repair.md) | **6/6** | 3/3 | 3/3 |
| [04 — Delegated budget](../reports/screening/original-five/04-delegated-budget-repair.md) | **6/6** | 3/3 | 3/3 |
| [05 — Compatible rollout](../reports/screening/original-five/05-compatible-rollout-repair.md) | **6/6** | 3/3 | 3/3 |
| [12 — Verified installation](../reports/screening/third-five/12-verified-installation-repair.md) | **6/6** | 3/3 | 3/3 |
| [13 — Capacity maintenance](../reports/screening/third-five/13-capacity-maintenance-repair.md) | **6/6** | 3/3 | 3/3 |
| [18 — Recurring calendar](../reports/screening/fourth-five/18-recurring-calendar-repair.md) | **6/6** | 3/3 | 3/3 |
| [19 — Variant cache](../reports/screening/fourth-five/19-variant-cache-repair.md) | **6/6** | 3/3 | 3/3 |
| [20 — Workflow authority](../reports/screening/fourth-five/20-workflow-authority-repair.md) | **6/6** | 3/3 | 3/3 |
| [21 — Incremental build](../reports/screening/fifth-five/21-incremental-build-repair.md) | **6/6** | 3/3 | 3/3 |
| [25 — Issued report](../reports/screening/fifth-five/25-issued-report-repair.md) | **6/6** | 3/3 | 3/3 |
| [10 — Temporal capacity](../reports/screening/next-five/10-temporal-capacity-repair.md) | **5/6** | 2/3 | 3/3 |
| [11 — Snapshot recovery](../reports/screening/third-five/11-snapshot-recovery-repair.md) | **5/6** | 3/3 | 2/3 |

**72 counted finalist trials: 70 reward=0, two reward=1; 36 Codex and 36 Claude.** All twelve sets are complete, with three trials per provider on each task.

[Results and counting method](../reports/screening/final-results-2026-09-11.md) · [Machine-readable evidence](../reports/screening/evidence/2026-09-11-twelve-finalists.json) · [Latest campaign checkpoint](../reports/screening/successor-results-2026-09-11.md).

Reward=0 denotes a failed required deliverable, including an incorrect submitted checker. Original grades, documented corrections and excluded attempts remain in the task histories. The September 9 [five-finalist milestone](../reports/screening/final-results-2026-09-09.md) is preserved separately.

Route policy stopped at **3/5 failures**, with two retained Codex passes and one unused slot. Its second pass survived an [additional audit](../reports/screening/route-trial-seven-pass-audit-2026-09-11.md) of 320 service configurations and 682 checker classifications. This version cannot reach 5/6.

## What is implemented

Twenty-five professional task source trees are maintained in Git. All twenty-five successors have empty public entry points, complete private references, valid alternatives, deliberately incorrect controls, scenario generators and regression tests. Public requirements and interfaces determine correctness.

The Foundry assembles separate solver/verifier workspaces, validates local controls, freezes trial packages, and preserves authorized attempts for analysis. The registry contains twenty-four Node portfolio tasks plus native Go CAA. Twelve older generic families are calibration tools, outside this professional task count.

All five original successor groups completed local native oracle/nop validation. Their preparation and trial reports remain in the [screening index](../reports/screening/README.md). The later 3.0.0 group added browser recovery, calendar synchronization, workflow dispatch, budget reservations and route migration requirements before its new trial sets began.

The earlier browser/calendar/workflow/budget/route group completed 31 physical attempts: 29 counted results, one Browser grading void and one Browser infrastructure interruption. Four tasks finished at 6/6 and Route at 3/5. Calendar and Budget's initial publication incidents occurred after grading; the completed evidence was recovered without another model call. Browser's excluded attempts remain excluded after fresh trials filled its missing provider slots. These distinctions are documented in the [combined results](../reports/screening/final-results-2026-09-11.md).

The subsequent five-successor campaign adds three balanced 6/6 sets. Partial release has audited valid passes; Ticket consolidation retains three counted failures while physical attempts 4–6 are audited nulls. The published checkpoint covers 28 physical attempts, including four follow-up attempts, and one recovered grading incident that added no provider call. The original controller error is preserved, with a separate reconciliation rather than a fabricated final marker.

## The portfolio

These links are reviewer-facing and include private grading material. Solvers receive only the explicit public assembly, never this repository.

| Cohort | Maintained task | Actual work | Evidence |
| --- | --- | --- | --- |
| Original | [caa-revalidation-repair](../tasks/caa-revalidation-repair/) | Concurrent domain authorization and cache correctness | [Trial 01](../reports/screening/original-five/01-caa-revalidation-repair.md) |
| Original | [browser-replay-repair](../tasks/browser-replay-repair/) | Live-DOM replay without wrong or duplicate effects | [Trial 03](../reports/screening/original-five/03-browser-replay-repair.md) |
| Original | [persistent-knowledge-repair](../tasks/persistent-knowledge-repair/) | Persistent revisions, complete lineage and publication authority | [Trial 02](../reports/screening/original-five/02-persistent-knowledge-repair.md) |
| Original | [delegated-budget-repair](../tasks/delegated-budget-repair/) | Cumulative delegated budgets and uncertain debits | [Trial 04](../reports/screening/original-five/04-delegated-budget-repair.md) |
| Original | [compatible-rollout-repair](../tasks/compatible-rollout-repair/) | Compatible, healthy deployment and scoped rollback | [Trial 05](../reports/screening/original-five/05-compatible-rollout-repair.md) |
| Next | [partition-index-repair](../tasks/partition-index-repair/) | Partition ownership, document versions and contiguous offsets | [Trial 06](../reports/screening/next-five/06-partition-index-repair.md) |
| Next | [causal-replica-repair](../tasks/causal-replica-repair/) | Causal siblings and tombstones without redundant effects | [Trial 07](../reports/screening/next-five/07-causal-replica-repair.md) |
| Next | [partial-release-repair](../tasks/partial-release-repair/) | Dependency-graph recovery under partial effects | [Trial 08](../reports/screening/next-five/08-partial-release-repair.md) |
| Next | [ticket-consolidation-repair](../tasks/ticket-consolidation-repair/) | Complete population, qualified identities and concurrent edits | [Trial 09](../reports/screening/next-five/09-ticket-consolidation-repair.md) |
| Next | [temporal-capacity-repair](../tasks/temporal-capacity-repair/) | Knowledge-time revision selection and exact integration | [Trial 10](../reports/screening/next-five/10-temporal-capacity-repair.md) |
| Third | [snapshot-recovery-repair](../tasks/snapshot-recovery-repair/) | Portable snapshot and independently verified SQLite restore | [Trial 11](../reports/screening/third-five/11-snapshot-recovery-repair.md) |
| Third | [verified-installation-repair](../tasks/verified-installation-repair/) | Verified bytes and ordered filesystem layers | [Trial 12](../reports/screening/third-five/12-verified-installation-repair.md) |
| Third | [capacity-maintenance-repair](../tasks/capacity-maintenance-repair/) | Maintenance with overlapping capacity requirements | [Trial 13](../reports/screening/third-five/13-capacity-maintenance-repair.md) |
| Third | [route-policy-repair](../tasks/route-policy-repair/) | Routing changes with preserved unrelated behavior | [Trial 14](../reports/screening/third-five/14-route-policy-repair.md) |
| Third | [rule-index-repair](../tasks/rule-index-repair/) | Efficient matching with unchanged semantics | [Trial 15](../reports/screening/third-five/15-rule-index-repair.md) |
| Fourth | [document-export-repair](../tasks/document-export-repair/) | Nested redaction with useful structure preserved | [Trial 16](../reports/screening/fourth-five/16-document-export-repair.md) |
| Fourth | [analytical-reconciliation-repair](../tasks/analytical-reconciliation-repair/) | Cross-system populations, identity and exact arithmetic | [Trial 17](../reports/screening/fourth-five/17-analytical-reconciliation-repair.md) |
| Fourth | [recurring-calendar-repair](../tasks/recurring-calendar-repair/) | Occurrence identity, timezone changes and exceptions | [Trial 18](../reports/screening/fourth-five/18-recurring-calendar-repair.md) |
| Fourth | [variant-cache-repair](../tasks/variant-cache-repair/) | Variants, age, revalidation and scoped invalidation | [Trial 19](../reports/screening/fourth-five/19-variant-cache-repair.md) |
| Fourth | [workflow-authority-repair](../tasks/workflow-authority-repair/) | Changing grants across queued work and completed history | [Trial 20](../reports/screening/fourth-five/20-workflow-authority-repair.md) |
| Fifth | [incremental-build-repair](../tasks/incremental-build-repair/) | Current dependency attestations and legitimate build reuse | [Trial 21](../reports/screening/fifth-five/21-incremental-build-repair.md) |
| Fifth | [event-window-repair](../tasks/event-window-repair/) | Event-time finalization, duplicates, idleness and late input | [Trial 22](../reports/screening/fifth-five/22-event-window-repair.md) |
| Fifth | [staged-allocation-repair](../tasks/staged-allocation-repair/) | Irrevocable choices preserving declared future feasibility | [Trial 23](../reports/screening/fifth-five/23-staged-allocation-repair.md) |
| Fifth | [diagnostic-transport-repair](../tasks/diagnostic-transport-repair/) | Fragmented decoding, attempt identity, errors and partial data | [Trial 24](../reports/screening/fifth-five/24-diagnostic-transport-repair.md) |
| Fifth | [issued-report-repair](../tasks/issued-report-repair/) | Dependent amendments and immutable historical publications | [Trial 25](../reports/screening/fifth-five/25-issued-report-repair.md) |

## Engineering decisions worth inspecting

- [Package assembly and policy](../src/packages/): content-bound components, public/private roles, controlled validation and recipient exports.
- [Execution lifecycle](../src/execution/): signed reservations, requested profiles, exclusive dispatch, bounded capture, immutable records and invalid-execution classification.
- [Learning layer](../src/learning/): qualified findings, correction propagation and specific/conceptual transfer hypotheses.
- [Tests](../test/): correct alternatives, near misses, protected-route checks, capture limits and accounting boundaries.
- [Next-cohort selection](../data/next-portfolio-selection-ledger.json), [third](../data/third-portfolio-selection-ledger.json), [fourth](../data/fourth-portfolio-selection-ledger.json) and [fifth](../data/fifth-portfolio-selection-ledger.json): decisions and exposure, not measured solve probabilities.

## Completed finalists and remaining work

All twelve qualifying sets are complete and meet the reported ≥5/6 target. Ticket consolidation remains outside that total. Its [later attempt-7 audit](../reports/pass-audits/ticket-consolidation-attempt-seven-2026-09-11.md) excludes physical attempts 4–7 as nulls; three counted trials remain available, starting with physical attempt 8 on corrected v2.0.5. These later updates are outside the fixed 28-attempt checkpoint above. Partial release has already been solved. Destination-specific submission review and required adversarial qualification remain separate from these results.
