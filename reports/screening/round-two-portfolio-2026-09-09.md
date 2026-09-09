# Trial 2 portfolio: all 25 packages evaluated

September 9, 2026. **25 distinct packages have completed Trial 2: five recorded
reward-zero results and twenty solver passes.** There were **26 launched attempts**:
the five groups of five plus route policy's separate retry. Its original interrupted
attempt remains unscored; the successful retry supplies that package's completed result.

The latest two groups added **one** zero reward, temporal capacity (10). The fourth
group added none, and the route-policy retry passed. The total therefore increased
from four to **five**, not six. These counts come from the retained per-attempt grades.

## All package outcomes

The table shows the completed Trial 2 result for each package. Service scenarios and
checker classifications are different denominators. CAA requires only a native Go
service. Every row links to its original analysis, preserving Trial 1, engineering
changes and dated Trial 2 results. Route policy's file preserves both the interruption
and the separate retry.

| Package and analysis | Target | Reward | Service | Checker |
| --- | --- | --- | --- | --- |
| [01 — caa-revalidation-repair](original-five/01-caa-revalidation-repair.md) | Codex | **1** | 24/24 | N/A |
| [02 — persistent-knowledge-repair](original-five/02-persistent-knowledge-repair.md) | Codex | **1** | 16/16 | 10/10 |
| [03 — browser-replay-repair](original-five/03-browser-replay-repair.md) | Claude | **1** | 20/20 | 10/10 |
| [04 — delegated-budget-repair](original-five/04-delegated-budget-repair.md) | Codex | **1** | 21/21 | 10/10 |
| [05 — compatible-rollout-repair](original-five/05-compatible-rollout-repair.md) | Claude | **1** | 18/18 | 11/11 |
| [06 — partition-index-repair](next-five/06-partition-index-repair.md) | Codex | **1** | 17/17 | 12/12 |
| [07 — causal-replica-repair](next-five/07-causal-replica-repair.md) | Codex | **1** | 33/33 | 11/11 |
| [08 — partial-release-repair](next-five/08-partial-release-repair.md) | Claude | **1** | 33/33 | 11/11 |
| [09 — ticket-consolidation-repair](next-five/09-ticket-consolidation-repair.md) | Claude | **1** | 33/33 | 13/13 |
| [10 — temporal-capacity-repair](next-five/10-temporal-capacity-repair.md) | Claude | **0** | 34/34 | 12/13 |
| [11 — snapshot-recovery-repair](third-five/11-snapshot-recovery-repair.md) | Codex | **0** | 33/33 | 10/12 |
| [12 — verified-installation-repair](third-five/12-verified-installation-repair.md) | Codex | **1** | 45/45 | 13/13 |
| [13 — capacity-maintenance-repair](third-five/13-capacity-maintenance-repair.md) | Claude | **1** | 27/27 | 12/12 |
| [14 — route-policy-repair](third-five/14-route-policy-repair.md) (retry) | Claude | **1** | 27/27 | 12/12 |
| [15 — rule-index-repair](third-five/15-rule-index-repair.md) | Codex | **1** | 26/26 | 13/13 |
| [16 — document-export-repair](fourth-five/16-document-export-repair.md) | Codex | **1** | 29/29 | 13/13 |
| [17 — analytical-reconciliation-repair](fourth-five/17-analytical-reconciliation-repair.md) | Codex | **1** | 28/28 | 14/14 |
| [18 — recurring-calendar-repair](fourth-five/18-recurring-calendar-repair.md) | Codex | **1** | 31/31 | 13/13 |
| [19 — variant-cache-repair](fourth-five/19-variant-cache-repair.md) | Claude | **0** | 24/25 | 14/15 |
| [20 — workflow-authority-repair](fourth-five/20-workflow-authority-repair.md) | Codex | **1** | 30/30 | 14/14 |
| [21 — incremental-build-repair](fifth-five/21-incremental-build-repair.md) | Codex | **0** | 27/27 | 14/15 |
| [22 — event-window-repair](fifth-five/22-event-window-repair.md) | Codex | **1** | 27/27 | 15/15 |
| [23 — staged-allocation-repair](fifth-five/23-staged-allocation-repair.md) | Claude | **1** | 41/41 | 13/13 |
| [24 — diagnostic-transport-repair](fifth-five/24-diagnostic-transport-repair.md) | Codex | **1** | 28/28 | 17/17 |
| [25 — issued-report-repair](fifth-five/25-issued-report-repair.md) | Claude | **0** | 27/27 | 12/14 |

## Recorded reward-zero successes

| Package | What failed |
| --- | --- |
| 21 — Incremental build | Required checker accepted premature publication; service passed. |
| 25 — Issued report | Required checker rejected correct implementations; service passed. |
| 19 — Variant cache | Recorded service-suite failure and checker miss; the first audit's matching/replacement contract question remains documented. |
| 11 — Snapshot recovery | Required checker rejected both correct reference implementations; service passed. |
| 10 — Temporal capacity | Required checker accepted the unread-empty-source control; service passed. |

Temporal capacity adds a supported required-checker failure. Its frozen contract
requires exhausting all source pages, and the checker sees host-recorded fetch
observations. The no-fetch exemption for zero records was introduced by the submitted
checker, not by the contract. An offline invocation of its unchanged bytes reproduced
the miss. The implementation and original grade were preserved.

A required-checker failure counts even when the service passes. No new condition
requiring a service bug, longer solve time or an explicit example of every test was
added. The existing cache question is unchanged; this publication does not relabel
its recorded reward or claim that the old audit resolved it.

## Campaign accounting and evidence

| Campaign | Launched | Scored | Reward zero | Solver pass | Interrupted/unscored |
| --- | --- | --- | --- | --- | --- |
| [First group](round-two-top-five-2026-09-09.md) | 5 | 5 | 3 | 2 | 0 |
| [Second group](round-two-next-five-2026-09-09.md) | 5 | 4 | 0 | 4 | 1 |
| [Third group](round-two-third-ranked-five-2026-09-09.md) | 5 | 5 | 1 | 4 | 0 |
| [Fourth group](round-two-fourth-ranked-five-2026-09-09.md) | 5 | 5 | 0 | 5 | 0 |
| [Final group](round-two-final-five-2026-09-09.md) | 5 | 5 | 1 | 4 | 0 |
| [Route-policy retry](evidence/2026-09-09-route-policy-repair-retry.json) | 1 | 1 | 0 | 1 | 0 |
| **Total** | **26** | **25** | **5** | **20** | **1 historical interruption** |

No package is awaiting its first completed Trial 2 result. The interrupted attempt
remains part of the execution history, not an extra zero or an erased attempt.
Across all completed records, **19,842 manifest-listed files** have been checked
against retained byte sizes and hashes. The latest publication verified 8,317 of
those files. These counts cover completed records; the partial capture has no
completion manifest.

## What to do with these results

Prioritize repeat attempts on versions that produced supported required-deliverable
failures, including temporal capacity and snapshot recovery. Keep failed submissions
unchanged as evidence; an agent's missed check is not a reason to repair its submission
or add a solution tutorial before measuring recurrence. Retain the twenty passing
submissions as correct controls. Longer runtime and more self-tests alone are not
reward-zero successes.

The latest reports also correct three execution-accounting errors: the final group
used 4 GiB for native CAA and 2 GiB for each Node task; the six-container overlap
covered the initial part of the route-policy retry rather than most of its runtime;
and that retry was a sixth, separately recorded manual attempt, not part of the
five-package campaign's five calls. No package, raw result, controller or runtime
was changed for this publication. It made zero model calls.

The expanded publication check also caught temporal capacity's service-pass label
copied into the public overall-outcome field. That field now matches the retained
`result.json`: `semantic-fail`, reward 0. Its service result remains `semantic-pass`;
no raw grade or reward changed. The check covers all five groups, native CAA and
the separately identified retry, so a passing link check cannot hide omitted groups.
