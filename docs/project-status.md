# Project status — a five-minute review

September 9, 2026. Navigation and status, not a package-policy approval.

## Latest measured progress

**Three packages have two consecutive recorded reward-zero results on unchanged
successors: incremental build (21), issued report (25), and variant cache (19).**
All five Trial 3 attempts completed without infrastructure errors. Snapshot recovery
(11) and temporal capacity (10) passed this attempt, retaining their earlier failures
in the same-version record. [Trial 3 results](../reports/screening/round-three-failing-five-2026-09-09.md).

The user reports that the CEO accepts **at least five failures out of six**, with
**three Claude and three Codex attempts per package**. All five remain within the
numerical threshold. The three at 2/2 need at least 3 failures from the remaining
4 attempts; the two at 1/2 need all 4. Different valid failure mechanisms can count;
one solver pass does not require restarting under this criterion.

**The next five attempts are prepared with the same providers again:** Claude for
19/25/10, Codex for 21/11. This completes three same-provider attempts on each
successor; the opposite-provider runs come afterward. It is labeled **Trial 4** in
the full histories. [Prepared handoff](round-four-failing-five-handoff.md).
Preparation made zero provider calls.

Successor Trials 2 and 3 total **31 attempts: 30 scored, 8 recorded zeroes,
22 solver passes and 1 historical infrastructure interruption**, across the same
25 packages. The historical Trial 2 totals below remain separate.

**All 25 packages have completed Trial 2: five recorded zero rewards and twenty
solver passes.** There were 26 attempts, including route policy's earlier unscored
interruption and successful separate retry. The latest two groups added one zero,
temporal capacity—not two. The fourth group returned five reward-one results.
See the [complete 25-package result table](../reports/screening/round-two-portfolio-2026-09-09.md).

| Trial 2 group | Attempts launched | Scored | Reward-zero results | Solver passes | Interrupted/unscored |
| --- | --- | --- | --- | --- | --- |
| [First: 19/21/25/24/07](../reports/screening/round-two-top-five-2026-09-09.md) | 5 | 5 | 3 | 2 | 0 |
| [Second: 14/03/18/20/04](../reports/screening/round-two-next-five-2026-09-09.md) | 5 | 4 | 0 | 4 | 1 |
| [Third: 13/08/15/12/11](../reports/screening/round-two-third-ranked-five-2026-09-09.md) | 5 | 5 | 1 | 4 | 0 |
| [Fourth: 09/06/05/16/17](../reports/screening/round-two-fourth-ranked-five-2026-09-09.md) | 5 | 5 | 0 | 5 | 0 |
| [Fifth: 23/02/10/01/22](../reports/screening/round-two-final-five-2026-09-09.md) | 5 | 5 | 1 | 4 | 0 |
| [Route-policy retry](../reports/screening/round-two-final-five-2026-09-09.md) | 1 | 1 | 0 | 1 | 0 |
| **Total** | **26** | **25** | **5** | **20** | **1 historical interruption** |

The fourth group is a clean sweep: all five reward 1, all five services and checkers
fully correct. Two are notable beyond a repeat pass: compatible rollout (05) had its
checker graded for the first time and gained new stage lost-response/recovery
semantics, both passing cleanly; analytical reconciliation (17) had Trial 1 scored
zero by the same private-label harness bug fixed above, and this independently-written
Trial 2 submission reaches the same clean pass under the corrected rule — a second,
independent confirmation of the capability, not a re-scored old result.

The fifth group: staged allocation, persistent knowledge, CAA revalidation (native,
no checker) and event window all passed cleanly. Persistent knowledge's checker and
new committed-publication redelivery contract were graded for the first time and
passed. Temporal capacity's service is fully correct (34/34); its checker's
`paginationViolation()` deliberately exempts "never fetched the source" when
`recordCount` is zero — a submitted exception that the source-traversal requirement does not permit — which happens to exempt exactly the `unread-empty-source` control this check
exists to catch. A separately-dispatched retry of route policy (14), run alongside
the fifth group to reach three Claude/three Codex for that round, finally resolved
its earlier interruption: 27/27 service, 12/12 checker, clean pass.

Incremental build (21), issued report (25), snapshot recovery (11) and temporal
capacity (10) have supported substantive failures of required agent-written
checkers. Their services passed; the incomplete or incorrect required validators
still make these task failures. Cache (19) retains its recorded service/checker zero
and the existing documented matching/replacement contract question. This update
adds temporal capacity's failure and route policy's resolved retry without changing
the earlier audit or any other raw scores.

**Trial 3 failure mechanisms:** incremental build again omitted issuance-before-use
ordering; issued report again rejected both known-good candidates, this time because
delivery wrappers were not handled. Variant cache passed 5/25 service scenarios and
failed 20 on `origin_load`, while its checker missed the same candidate as Trial 2.
Its new origin-budget service failure is supported independently of the earlier
matching/replacement note. Mechanism differences describe what happened; they are
not a requirement that failures repeat the same bug. The two passing submissions
avoided their earlier checker mistakes; two runs are too few to call those failures
one-off or estimate a dependable failure rate.

The second group is now fully documented: four completed solver passes and route
policy's infrastructure interruption, now resolved by the separate retry above
(reward null is preserved on the original interrupted record; the retry is its own,
later, separately-evidenced attempt). The third group completed without
infrastructure errors and supplies the checker failure noted above.

All twenty-five original analysis files contain dated Trial 2 records. **19,842**
completion-manifest files have been verified: 11,525 from the first three groups,
3,945 from the fourth, 3,627 from the fifth and 745 from the route-policy retry.
No package remains without a completed Trial 2 result. The original interruption
is preserved, and no package, submission or raw grade changed in this publication.

All five original analysis files also contain Trial 3 results. Their **4,448**
completion-manifest files were reverified, giving **24,290** across scored successor
attempts. Two Trial 3 publication rows incorrectly copied the service outcome as the
overall outcome; they now match raw results, with the service outcome separate.
No recorded reward changed.

Prioritize observed required-deliverable failures for further trials; retain solver
passes as correct controls. Temporal capacity and snapshot recovery can be repeated
on their unchanged versions without adding solution hints or fixing the agents'
failed submissions. No additional model calls were made for documentation.

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
and resolve several earlier contradictions. The remaining Trial 2 contract question is
cache wildcard matching for replacement. Resolve that narrowly before treating its zero
as an undisputed fair failure. Incremental build and issued report can be repeated on
their frozen versions without adding solution guidance. Additional issued-report
aggregate-input documentation is optional; its documented observations already suffice.

All twenty-five successor packages have retained validation evidence. Their old
Trial 1 results still measure the old versions. Trial 2 and Trial 3 results retain
their exact package and profile identities; preparation of Trial 4 changes neither.

Fresh verification and limits appear in [the publication report](../reports/PORTFOLIO-PUBLICATION.md). Historical snapshot-local assurance does not automatically certify a new merged build. No new provider attempts or release approvals are made by publication.

## A reproducible review path

Read this page, one package's public semantics, its independent verifier and its trial analysis. Then follow [testing](testing.md) and [production](professional-portfolio.md) to reproduce local checks. A reviewer should not need private scratch notes to understand the work.
