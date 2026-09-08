# Screening results and what they changed

Ten different professional packages have a completed real-agent screening attempt on record. All ten submitted **service implementations** passed their frozen service suites. In the second batch, one submitted checker rejected a valid alternative; another received zero solely because the grader demanded exact reason strings where the public wording did not clearly require that format.

That is useful negative evidence about our difficulty hypotheses—not ten hard tasks, and not two clean benchmark wins. The engineering response is to preserve the successful solutions, correct invalid measurements, and build stronger *contract-valid* successors.

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

First-batch times are the campaign's rounded dispatch-through-grading durations. Second-batch times are authoring durations; do not compare them as identical measurements. Service scenarios, individual checks, checker candidates and an agent's self-tests are separate denominators.

## What the evidence supports

- The agents often reconstructed the public contracts, built their own simulators or checkers, and solved the multi-file services in minutes. More files and more near-miss controls did not establish difficulty.
- Causal replica provides a concrete incomplete-self-check observation: the repair is correct, but its checker requires redundant writes that the contract does not require. This remains a single, not independently blind-adjudicated observation.
- Partial release is a measurement problem to repair. Its checker correctly classified all eleven candidates and supplied the expected check names as explanatory prefixes. The exact-string gate is not a legitimate hardness mechanism.
- The browser report's earlier claim of a verifier blind spot was retracted: the independent completion check already rejected missing real effects. A suspicious self-report is not proof of a false pass.

## What went wrong operationally

The first CAA dispatch used an author README containing the solution explanation instead of the solver instruction. That attempt is contaminated, despite a recorded pass. A fresh clean-instruction attempt also solved the task. Two other first-batch attempts failed when capture rejected legitimate large JSON events; the bounded event-line fix and regression tests are now maintained code. Their retries are not independent difficulty replications.

The first campaign also documented an accidental timed-out provider call during setup. It is not hidden inside the five final outcomes. The second campaign requested simultaneous dispatch but actually ran sequentially; its attempted parallel takeover made no additional provider calls. There were five attempts, no automatic retries and no recorded invalid executions in that second campaign.

## Provenance, privacy and remaining uncertainty

The next-five analyses also retain concurrently supplied follow-up notes about a local reasons-format repair, clarified replica wording and diagnostic regrades. These refer to a **separate local successor tree**, not the root implementation integrated in this publication. Their restricted regrade record is not part of the ten original manifest verifications below. Original outcomes remain unchanged; do not treat a successor regrade as a new model attempt or merge it into a replication count.

[Original-five evidence](evidence/2026-09-07-original-five.json) and [next-five evidence](evidence/2026-09-08-next-five.json) contain allowlisted result fields, package/profile/source identities, and completion/result/grade hashes. During publication, all **4,057 files listed by the ten selected completion manifests** matched their recorded byte sizes and hashes. This checks retained-file integrity, not scientific validity or completeness of the original capture.

Raw transcripts, credentials, full trial workspaces and large runtime/browser artifacts remain restricted. Hashes let a reviewer identify artifacts supplied through a separately reviewed channel; this public subset alone cannot reproduce or independently audit every historical trial. It contains no claim of external blind review.

Requested settings are not runtime attestations. Claude model strings were observable in these captures; effort was not independently attested, and Codex's model identity was unobservable. CLI dollar estimates are not subscription charges. No official adversarial matrix or three-per-model qualification is claimed. The [current portfolio](../../docs/project-status.md) lists construction separately from historical screening.
