# Project status — a five-minute review

September 9, 2026. Navigation and status, not a package-policy approval.

## Latest measured progress

**Incremental build now has four consecutive failures across Codex and Claude. A targeted
pass audit also found two missed checker defects and reopened temporal capacity and
snapshot recovery. Five packages remain in contention.**

The original Trial 5 grades are three passes and one failure. The coverage repair
`final-six-coverage-v1` changes the effective Trial 3 result for 10 and 11 from 1 to 0,
after replaying every retained submission for those tasks. Original rewards and manifests
remain intact. No new model calls were made by the audit or preparation.

| Package | Effective failures/scored | Remaining provider | Remaining slots | Requirement |
| --- | --- | --- | --- | --- |
| 21 Incremental build | **4/4** | Claude | 2 | At least one failure; run both |
| 19 Variant cache | **3/4** | Codex | 2 | Both must fail |
| 25 Issued report | **3/4** | Codex | 2 | Both must fail |
| 10 Temporal capacity | **3/4** | Codex | 2 | Both must fail |
| 11 Snapshot recovery | **2/3** | Claude | 3 | All three must fail |

The target is the user-reported **at least five failures in six scored attempts**, with
**three Claude and three Codex**. Different legitimate failure mechanisms count. The
private coverage repair adds no public requirements or solution hints. The eleven
remaining slots are prepared with at most three concurrent attempts and per-package
early stopping after 5/6 becomes impossible. None has launched.

Across successor Trials 2–5, the immutable raw record is **40 attempts, 39 scored,
13 recorded zeroes, 26 recorded passes and 1 infrastructure interruption**, across
25 distinct packages. Applying the documented repair gives **15 effective failures and
24 effective passes** among those same 39 scored attempts; these are not extra trials.
All 25 packages completed Trial 2: five recorded zeroes and twenty passes, with the
route-policy retry resolving its separately retained interruption.

[Audit and corrected standings](../reports/screening/final-six-pass-audit-2026-09-09.md) ·
[Regrade evidence](../reports/screening/evidence/2026-09-09-final-six-pass-audit.json) ·
[Prepared final campaign](../reports/screening/evidence/2026-09-09-final-six-preparation.json) ·
[Operator handoff](final-six-handoff.md).
[Trial 5](../reports/screening/round-five-continuing-four-2026-09-09.md) ·
[Trial 4](../reports/screening/round-four-failing-five-2026-09-09.md) ·
[Trial 3](../reports/screening/round-three-failing-five-2026-09-09.md) ·
[All 25 Trial 2 results](../reports/screening/round-two-portfolio-2026-09-09.md).

## What is implemented

Twenty-five professional task source trees are maintained in Git. All twenty-five
successors replace mostly solved public starter modules with empty entry points and
retain complete private service/checker references, valid alternatives, deliberately
incorrect controls, scenario generators and regression tests. Public contracts and
interfaces remain the authority for judging fair failures.

The foundry assembles separate solver/verifier workspaces, validates local controls, retains exact versions, and records authorized attempts for read-only analysis. The registry contains twenty-four Node portfolio IDs plus native Go CAA. Twelve older generic families are calibration tools, not twelve additional professional packages.

The original 25 screenings all passed their service suites. Their recorded checker
outcomes and historical grading concerns remain intact in the [trial index](../reports/screening/README.md).
Thirty-one successor attempts, thirty scored, now extend that history; the Trial 2 results above
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

The planned six-run sets and required final standard/adversarial qualification remain
incomplete. The current acceptance threshold is the user's reported 5-of-6 criterion;
this progress report adds no requirement for identical bugs or six consecutive zeroes.

The partial-release reason-format issue remains a blocker for treating its historical zero as a capability failure. Shared reason-prefix matching and explicit checker schemas were repaired in new versions before batch 3. No historical result is overwritten by that repair.

The ranked successors make checker reasons diagnostic-only, integrate protected controls
and resolve earlier contradictions. Historical attribution notes remain in each trial
document. The current six-run campaign uses the unchanged public tasks and exact provider
profiles, plus the documented private coverage repair for 10 and 11. No extra solution
guidance or requirement for identical failure mechanisms is needed.

All twenty-five successor packages have retained validation evidence. Their old
Trial 1 results still measure the old versions. Trials 2–5 retain their exact package
and profile identities. Raw grades remain immutable alongside the separate coverage regrade.

Fresh verification and limits appear in [the publication report](../reports/PORTFOLIO-PUBLICATION.md). Historical snapshot-local assurance does not automatically certify a new merged build. No new provider attempts or release approvals are made by publication.

## A reproducible review path

Read this page, one package's public semantics, its independent verifier and its trial analysis. Then follow [testing](testing.md) and [production](professional-portfolio.md) to reproduce local checks. A reviewer should not need private scratch notes to understand the work.
