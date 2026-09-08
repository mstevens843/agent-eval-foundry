# Screening results and what they changed

Batches 3, 4 and 5 are complete and analyzed: fifteen attempts, five concurrent jobs per batch, no retries or recorded execution errors. See the
[batches 3–5 preflight checkpoint](../../docs/screening-batches-3-5.md) for current
readiness repairs and resolved storage blocker. The ten historical results below are unchanged.

Twenty-five different professional packages have a completed real-agent screening attempt on record. All twenty-five submitted **service implementations** passed their frozen service suites. In the second batch, one submitted checker rejected a valid alternative; another received zero solely because the grader demanded exact reason strings where the public wording did not clearly require that format. In batch 4, every checker correctly classified every candidate, but three received zero for reason-label disagreements. Two contradict actual failed-obligation sets; the third exposes undefined public label scope. Batch 5 adds four reward-one results and an incremental-build zero for another undefined label-scope distinction, despite correct classification of every candidate.

That is useful negative evidence about our difficulty hypotheses—not twenty-five hard tasks, and not six clean benchmark wins. The engineering response is to preserve the successful solutions, correct invalid measurements, and build stronger *contract-valid* successors.

## Read the individual trials

| Package | Requested agent | Elapsed | Service | Overall recorded result | Analysis |
| --- | --- | --- | --- | --- | --- |
| Certificate authorization | Codex / Sol xhigh | 13m 04s | Pass | Reward 1, clean-instruction retry | [01 — CAA](original-five/01-caa-revalidation-repair.md) |
| Persistent knowledge | Codex / Sol xhigh | 6m 10s | 12/12 | Reward 1 | [02 — Knowledge](original-five/02-persistent-knowledge-repair.md) |
| Browser replay | Claude / Opus 5 max | 25m 35s | 16/16 | Reward 1, capture-fix retry | [03 — Browser](original-five/03-browser-replay-repair.md) |
| Delegated budget | Claude / Opus 5 max | 11m 59s | 12/12 | Reward 1, capture-fix retry | [04 — Budget](original-five/04-delegated-budget-repair.md) |
| Compatible rollout | Claude / Opus 5 max | 7m 21s | 12/12 | Reward 1 | [05 — Rollout](original-five/05-compatible-rollout-repair.md) |
| Partition index | Codex / Sol xhigh | 18m 48s | 17/17 | Reward 1; checker 12/12 | [06 — Index](next-five/06-partition-index-repair.md) |
| Causal replica | Codex / Sol xhigh | 11m 21s | 33/33 | Reward 0; checker rejects a valid alternative | [07 — Replica](next-five/07-causal-replica-repair.md) |
| Partial release | Claude / Opus 5 max | 20m 25s | 33/33 | Reward 0; reason-format alignment concern | [08 — Release](next-five/08-partial-release-repair.md) |
| Ticket consolidation | Claude / Opus 5 max | 14m 07s | 33/33 | Reward 1; checker 12/12 | [09 — Tickets](next-five/09-ticket-consolidation-repair.md) |
| Temporal capacity | Claude / Opus 5 max | 11m 27s | 33/33 | Reward 1; checker 12/12 | [10 — Capacity](next-five/10-temporal-capacity-repair.md) |
| Snapshot recovery | Codex / Sol xhigh | 14m 27s | 33/33 | Reward 1; checker 12/12 | [11 — Recovery](third-five/11-snapshot-recovery-repair.md) |
| Verified installation | Codex / Sol xhigh | 16m 27s | 44/44 | Reward 1; checker 13/13 | [12 — Installation](third-five/12-verified-installation-repair.md) |
| Capacity maintenance | Claude / Opus 5 max | 24m 26s | 138/138 | Reward 1; checker 12/12 | [13 — Maintenance](third-five/13-capacity-maintenance-repair.md) |
| Route policy | Claude / Opus 5 max | 45m 15s | 25/25 | Reward 1; checker 12/12 | [14 — Routing](third-five/14-route-policy-repair.md) |
| Rule index | Claude / Opus 5 max | 15m 12s | 25/25 | Reward 1; checker 12/12 | [15 — Matcher](third-five/15-rule-index-repair.md) |
| Document export | Codex / Sol xhigh | 15m 30s | 29/29 | Reward 1; checker 13/13 | [16 — Export](fourth-five/16-document-export-repair.md) |
| Analytical reconciliation | Codex / Sol xhigh | 18m 28s | 28/28 | Reward 0; private-primary-label defect | [17 — Analytics](fourth-five/17-analytical-reconciliation-repair.md) |
| Recurring calendar | Claude / Opus 5 max | 27m 16s | 31/31 | Reward 0; reason-taxonomy concern | [18 — Calendar](fourth-five/18-recurring-calendar-repair.md) |
| Variant cache | Claude / Opus 5 max | 29m 06s | 25/25 | Reward 1; checker 13/13 | [19 — Cache](fourth-five/19-variant-cache-repair.md) |
| Workflow authority | Claude / Opus 5 max | 18m 13s | 30/30 | Reward 0; prompt/grader label contradiction | [20 — Workflow](fourth-five/20-workflow-authority-repair.md) |
| Incremental build | Codex / Sol xhigh | 15m 31s | 27/27 | Reward 0; reason-taxonomy concern | [21 — Build](fifth-five/21-incremental-build-repair.md) |
| Event window | Codex / Sol xhigh | 7m 41s | 27/27 | Reward 1; checker 14/14 | [22 — Windows](fifth-five/22-event-window-repair.md) |
| Staged allocation | Claude / Opus 5 max | 18m 11s | 41/41 | Reward 1; checker 13/13 | [23 — Allocation](fifth-five/23-staged-allocation-repair.md) |
| Diagnostic transport | Claude / Opus 5 max | 12m 43s | 28/28 | Reward 1; checker 13/13 | [24 — Transport](fifth-five/24-diagnostic-transport-repair.md) |
| Issued report | Claude / Opus 5 max | 25m 57s | 27/27 | Reward 1; checker 13/13 | [25 — Reports](fifth-five/25-issued-report-repair.md) |

First-batch times are the campaign's rounded dispatch-through-grading durations. Later-batch times are authoring durations; do not compare them as identical measurements. Service scenarios, individual checks, checker candidates and an agent's self-tests are separate denominators.

## What the evidence supports

- The agents often reconstructed the public contracts, built their own simulators or checkers, and solved the multi-file services in minutes. More files and more near-miss controls did not establish difficulty.
- Causal replica provides a concrete incomplete-self-check observation: the repair is correct, but its checker requires redundant writes that the contract does not require. This remains a single, not independently blind-adjudicated observation.
- Partial release is a measurement problem to repair. Its checker correctly classified all eleven candidates and supplied the expected check names as explanatory prefixes. The exact-string gate is not a legitimate hardness mechanism.
- The browser report's earlier claim of a verifier blind spot was retracted: the independent completion check already rejected missing real effects. A suspicious self-report is not proof of a false pass.
- Batch 4 exposes another evaluator error: private primary control labels are not interchangeable with the full set of genuinely violated public obligations. Workflow's checker followed the prompt's explicit `terminal_history` instruction and was penalized for not saying `completion`.
- Cache self-fuzzing retained nine wildcard-preservation misses despite its successful hidden grade. This is a narrow control/contract follow-up, not a failed original trial. Calendar also surfaced ambiguous cancelled-move behavior requiring clarification.
- Batch 5 confirms the same construction limitation: a complete public finite model plus mostly correct starter machinery often leads to a compact repair and a successful checker. Staged allocation reduced to a fifteen-line recursive policy module. Its unrealized-future-promise test and transport's generator-plan oracle are useful testing techniques to retain.
- Incremental build reveals the limit of the reason fix: allowing any actually failed label works, but the domain's label definitions must also match public language. Missing/foreign targets were reasonably called publication-scope failures; the hidden taxonomy assigns them only to current artifacts.

## What went wrong operationally

Batch 3 fulfilled the requested scheduling: all five jobs were reserved before launch, launched within 270 milliseconds and observed running together. It had exactly five attempts, no retries and no recorded invalid executions. Fresh checker-interface fixes and protected assurance preceded dispatch; no task was changed during those attempts.

The maintenance problem reduced to a small finite search; routing admitted a behavior-preserving graph transformation. Both agents built tests beyond the visible suite. Routing's self-tests exposed and repaired its own sampled-route checking gap before submission. These are useful lessons about why the packages were solved, not evidence of a new model weakness.

The first CAA dispatch used an author README containing the solution explanation instead of the solver instruction. That attempt is contaminated, despite a recorded pass. A fresh clean-instruction attempt also solved the task. Two other first-batch attempts failed when capture rejected legitimate large JSON events; the bounded event-line fix and regression tests are now maintained code. Their retries are not independent difficulty replications.

The first campaign also documented an accidental timed-out provider call during setup. It is not hidden inside the five final outcomes. The second campaign requested simultaneous dispatch but actually ran sequentially; its attempted parallel takeover made no additional provider calls. There were five attempts, no automatic retries and no recorded invalid executions in that second campaign.

## Provenance, privacy and remaining uncertainty

The next-five analyses also retain concurrently supplied follow-up notes about a local reasons-format repair, clarified replica wording and diagnostic regrades. These refer to a **separate local successor tree**, not the root implementation integrated in this publication. Their restricted regrade record is not part of the ten original manifest verifications below. Original outcomes remain unchanged; do not treat a successor regrade as a new model attempt or merge it into a replication count.

Subsequent batches 3–5 preparation integrates the reason-format matching and positive
variant infrastructure into maintained code, without importing those diagnostic
regrades as new trials. Fresh batches 3–5 validation passed. Batch 5 was rebuilt and revalidated again after batch-4 label findings, before any provider dispatch. The historical
publication statement above describes the earlier integration boundary.

[Original-five evidence](evidence/2026-09-07-original-five.json) and [next-five evidence](evidence/2026-09-08-next-five.json) contain allowlisted result fields, package/profile/source identities, and completion/result/grade hashes. During publication, all **4,057 files listed by the ten selected completion manifests** matched their recorded byte sizes and hashes. This checks retained-file integrity, not scientific validity or completeness of the original capture.

Raw transcripts, credentials, full trial workspaces and large runtime/browser artifacts remain restricted. Hashes let a reviewer identify artifacts supplied through a separately reviewed channel; this public subset alone cannot reproduce or independently audit every historical trial. It contains no claim of external blind review.

[Third-five evidence](evidence/2026-09-08-third-five.json) adds five original outcomes and **3,630 verified manifest-listed files**, bringing the selected total to 7,687. Its reports distinguish the agents' self-measurements from the independent protected grades.

[Fourth-five evidence](evidence/2026-09-08-fourth-five.json) adds **3,829 verified manifest-listed files**, bringing the selected total to **11,516**. All five launches occurred within 233 milliseconds, with five containers observed concurrently, no retries and no recorded execution errors. Original zeroes are preserved beside their grading-alignment assessments; they are not converted into new passing attempts.

[Fifth-five evidence](evidence/2026-09-08-fifth-five.json) adds **3,894 verified manifest-listed files**, bringing the selected total to **15,410**. Five launches occurred within 268 milliseconds and were observed running concurrently. The new private grade summary retains the actual reason policy and failure sets without exposing answers to the checker. The original build zero remains unchanged. Across this fifteen-attempt campaign, every service and every checker's good/bad classification passed; four reason-only zeroes are alignment defects/concerns, not clean capability failures.

Requested settings are not runtime attestations. Claude model strings were observable in these captures; effort was not independently attested, and Codex's model identity was unobservable. CLI dollar estimates are not subscription charges. No official adversarial matrix or three-per-model qualification is claimed. The [current portfolio](../../docs/project-status.md) lists construction separately from historical screening.
