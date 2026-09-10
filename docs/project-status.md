# Project status — a five-minute review

September 9, 2026. Navigation and status, not a package-policy approval.

## Latest measured progress

**Three finalists have completed the reported ≥5/6 failure target: two at 6/6 and
one at 5/6. Two finalists await three fresh Codex replacements.** The latest audit
confirmed three more false passes. At the user's request those three are unscored,
with their raw records and diagnostic regrades preserved. Earlier agreed regrades
remain counted.

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

[Latest audit](../reports/screening/remaining-pass-audit-2026-09-09.md) ·
[Counting disposition](../reports/screening/evidence/2026-09-09-three-replacement-disposition.json) ·
[Three-replacement handoff](../docs/three-replacements-handoff.md).

The completed sets have three counted Codex and three counted Claude attempts. The
remaining slots restore that balance for cache and snapshot. The reported ≥5/6
screening target remains separate from final rubric and adversarial qualification.

## What is implemented

Twenty-five professional task source trees are maintained in Git. All twenty-five
successors replace mostly solved public starter modules with empty entry points and
retain complete private service/checker references, valid alternatives, deliberately
incorrect controls, scenario generators and regression tests. Public contracts and
interfaces remain the authority for judging fair failures.

The foundry assembles separate solver/verifier workspaces, validates local controls, retains exact versions, and records authorized attempts for read-only analysis. The registry contains twenty-four Node portfolio IDs plus native Go CAA. Twelve older generic families are calibration tools, not twelve additional professional packages.

The original 25 screenings all passed their service suites. Their recorded checker
outcomes and historical grading concerns remain intact in the [trial index](../reports/screening/README.md).
Fifty-one successor attempts, fifty scored, now extend that history; the Trial 2 results above
must not be merged into the original table or treated as repeat runs of identical versions.

Engineering preparation covers [19/21/25/24/07](../reports/screening/top-five-implementation-plan-2026-09-09.md),
[14/03/18/20/04](../reports/screening/next-five-implementation-plan-2026-09-09.md),
[13/08/15/12/11](../reports/screening/third-ranked-five-implementation-plan-2026-09-09.md),
[09/06/05/16/17](../reports/screening/fourth-ranked-five-implementation-plan-2026-09-09.md), and
[23/02/10/01/22](../reports/screening/final-five-implementation-plan-2026-09-09.md).
All five groups completed local native oracle/nop validation. The second group's
browser integrity rerun passed all six controls. All five groups have now published
Trial 2 campaign summaries, sanitized evidence and per-task analyses; the route-policy retry has its own separate campaign directory and evidence.
Campaign results remain separate from local validation. The [final group](final-five-implementation.md)
passed 90 assurance checks, 51 Node checker classifications, 110 static checks and all
native oracle/nop runs. CAA retains its native Go service deliverable; the other four
require service and checker. All 25 native exports reproduce. No candidates remain
unimplemented. This preparation launched no model attempts.

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

## What remains

Three Codex replacements remain: cache T8/T9 and snapshot T8. They are prepared to
start together with a cap of six. Three other finalists are complete at 6/6, 6/6 and
5/6. Final submission review and required cheat checks remain separate.
