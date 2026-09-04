# Phase 15 - Discovery Engine V2

## Verdict

No prospective candidate cleared independent reading, so none was eligible for its cheap probe. The foundry remains a screening instrument on this run.

The bounded run searched **4** prospective source units, extracted **4** patterns, drafted **2** candidates, removed **1** semantic duplicate, sent **1** candidate to readers, and produced **0** probe survivor. Prospective source-to-probe yield: **0.0%**.
Measured discovery cost: **not finite: no probe survivor**. This is source-to-probe cost, not hours per family and not cost per hard task.

## Frozen Prospective Evaluation

Run `phase15-bounded-corpus-v1` is pinned to preregistration SHA-256 `dd2a3f95c9933ab32aafc35aa10700e834d956d64f57f6c35f565488f226de18` at baseline commit `523ba07`.
Finalized inputs: source corpus `c69a96d399e5e1dc0852168039e2225b034975b08e6368e65f7eded65b32f1eb`; blind-review ledger `79365fdde531602a5a148884ee77c407a220bde4443cbbfd0fb73bf40e948c19`.
Caps: 6 total source units, 4 prospective drafts, 8 independent reads, 2 probes, $25.00 priced reader spend, and 0 paid subject trials.
The source list, expected yield, novelty standard, 2-of-2 reader threshold, promotion criteria
and stopping rules were written before the two new external sources were inspected.
That ordering is preserved by this execution transcript, not by trustworthy repository timestamps:
the registration's midnight value predates its baseline commit and the corpus timestamp was an
invalid future placeholder. This run is prospective in execution order, but not independently
timestamp-proven from a fresh clone.

| prediction | outcome |
|---|---|
| patternsExtracted | met |
| candidateDrafts | falsified |
| unanimousReaderSurvivors | falsified |
| probeSurvivors | falsified |

## Provenance-First Extraction

| source unit | role | channel | evidence boundary | extraction | reason |
|---|---|---|---|---|---|
| `outbox-verifier-repairs` | calibration only | verifier-repair-bypass | yes (repo-audit) | retrospective-excluded | Retrospective outbox calibration and a validity-control pattern, not a prospective family candidate. |
| `outbox-self-check-trajectories` | calibration only | agent-self-check-failure | yes (countable-agent-trials) | retrospective-excluded | Retrospective recovery of the outbox is explicitly excluded from prospective discovery yield. |
| `live-dom-counted-failure` | prospective | benchmark-trajectory-solve-patch | yes (countable-agent-trial) | deduplicated-existing | The proposal carries the same causal axis and action contract as ui-replay-live-dom; a new domain is not novelty. |
| `checker-required-counted-failure` | prospective | agent-self-check-failure | yes (countable-agent-trial-mixed-cause) | ineligible-evidence | The only isolated cause is a validity defect; promoting the unresolved residual would launder mixed evidence into difficulty. |
| `terminal-bench-rs-archive-clone` | prospective | known-hard-benchmark | no (authoritative-benchmark-task-artifact) | ineligible-evidence | The source is authoritative precedent but has no countable observed agent failure in the available evidence, so it cannot clear this run's promotion rule. |
| `cloudflare-2019-regex-outage` | prospective | authoritative-incident-upstream-fix | yes (authoritative-primary-source-incident) | candidate-drafted | Eligible source evidence, structural boundary and a new causal axis; independent reading required. |

All six source channels are enum-checked by the typed schema. This run exercised local document,
counted trial-directory, pinned upstream task, and first-party incident adapters. Boundary-first is a
registered comparator rather than a rerun. Adding a corpus changes the adapter input, not scoring.
Every source produces at most one canonical pattern. Source incident, affected layer, authority
boundary, causal axis, and action contract form the semantic key; domains and titles do not.

| source unit | locator | revision | content address | observed failure |
|---|---|---|---|---|
| `outbox-verifier-repairs` | `/Users/devlegacy/Desktop/projects/klavis-terminal-bench-task/FINDINGS.md#6` | `22f3cb9694ced2595af38a9a9b64edb28337e6b3` | `d66dcdf9067808d74bb5ec763325a37dc16ffe7855d021cf57bc1639f626f6d7` | A no-op passed 113 of 113 checks, same-process oracle rebinding could replace trusted outputs, and the nominal database-role boundary did not prevent direct writes. |
| `outbox-self-check-trajectories` | `/Users/devlegacy/Desktop/projects/klavis-terminal-bench-task/results/34-cc267-standard-matrix.md` | `22f3cb9694ced2595af38a9a9b64edb28337e6b3` | `c2030f0d135bf9ae57ac14f259dd1d9b72e47e4daaaa06b6f44a1dc1d2a77f37` | Three agents ran their own checks green over submissions the verifier rejected; the other three wrote no executable assertion capable of contradicting them. |
| `live-dom-counted-failure` | `trials/ui-replay-live-dom/live-dom-2026-08-o2` | `523ba07` | `e0a96517796bed10337fa147716f9cf8cf43d97092823e0100610a496bbef00d` | The subject failed 219 of 864 live replay scenarios: 139 replay completion checks and 80 precondition-observation checks. |
| `checker-required-counted-failure` | `trials/checker-required-memory-poisoning/checker-required-2026-08-o1` | `523ba07` | `167a5ed198ed5ba3cd197927af1a415614bdcc7ad734de17a210c2b7b82fad5b` | The subject failed 614 of 792 scenarios; 531 subject-rule failures are exactly explained by an unpublished graded reason-code vocabulary, while checker-side residuals have not been independently attributed. |
| `terminal-bench-rs-archive-clone` | [primary source](https://github.com/harbor-framework/terminal-bench/tree/83c7a6172d629c6575b785ab12c8db787bb2e323/tasks/rs-archive-clone) | `83c7a6172d629c6575b785ab12c8db787bb2e323` | `e6fc10fa851281f792de3aaddfaea5b378157801` | The task's own explanation identifies tiny mismatches across interacting archive, package, transform, recovery and malformed-input layers as verifier failures; no countable agent failure is preserved here. |
| `cloudflare-2019-regex-outage` | [primary source](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/) | `published-2019-07-12-retrieved-2026-09-04` | `191cb2699b53f0fa09157484571f8a7816d99c72f8df404bff8e904f28ffd6c4` | Functional CI passed a WAF rule whose catastrophic backtracking exhausted HTTP/HTTPS CPUs globally; the suite checked blocking behavior but not runaway resource use. |

Domain breadth is **4** while failure-axis breadth is **4**. These are deliberately separate; four domain labels do not imply four independent hard mechanisms.

## Candidate Queue

| candidate | source channel | causal axis | score | queue | reader decision | operator evidence |
|---|---|---|---:|---|---|---|
| `controller-rebinding-replay` | benchmark-trajectory-solve-patch | `logical-target-rebinding-under-object-churn` | 80.0 | deduplicated | not reviewed | `fuzz-controlling-parameter`: phase14-measured-null; `recompute-activation-concentration`: phase14-measured-null |
| `waf-semantic-complexity-repair` | authoritative-incident-upstream-fix | `semantic-correctness-with-adversarial-complexity` | 90.0 | reader-review | killed | `verifier-process-and-ledger-isolation`: validity-control-only; `fuzz-controlling-parameter`: phase14-measured-null; `narrow-mutant-isolation`: validity-control-only; `b6-rig-integrity-controls`: validity-control-only |

The live-DOM transfer is a measured extraction success but a candidate failure: its new
controller domain retains the built family's causal axis and action contract, so semantic dedup
removes it before model reads. The checker-required source stops earlier because its isolated
cause is specification omission. The archive precedent stops because no countable agent matrix
is available. Those are source-to-decision measurements, not missing output.

## Phase 14 In Ranking

| candidate | operator | status | Phase 14 estimate | rank delta | reason |
|---|---|---|---:|---:|---|
| `controller-rebinding-replay` | `fuzz-controlling-parameter` | phase14-measured-null | 0.000 | 0.0 | Phase 14 E4-selection measured a descriptive 0.000 effect; no difficulty credit is awarded. |
| `controller-rebinding-replay` | `recompute-activation-concentration` | phase14-measured-null | 0.000 | 0.0 | Phase 14 E4-selection measured a descriptive 0.000 effect; no difficulty credit is awarded. |
| `waf-semantic-complexity-repair` | `verifier-process-and-ledger-isolation` | validity-control-only | - | 0.0 | Validity controls determine whether reward means anything; they never receive difficulty uplift. |
| `waf-semantic-complexity-repair` | `fuzz-controlling-parameter` | phase14-measured-null | 0.000 | 0.0 | Phase 14 E4-selection measured a descriptive 0.000 effect; no difficulty credit is awarded. |
| `waf-semantic-complexity-repair` | `narrow-mutant-isolation` | validity-control-only | - | 0.0 | Validity controls determine whether reward means anything; they never receive difficulty uplift. |
| `waf-semantic-complexity-repair` | `b6-rig-integrity-controls` | validity-control-only | - | 0.0 | Validity controls determine whether reward means anything; they never receive difficulty uplift. |

Phase 14's measured operator ranking is empty. Local reference/mutant discrimination remains
valid activation evidence, but it contributes no positive difficulty prior. Unmapped operators
remain hypotheses, and validity controls receive no hardness points.

## Blind Reader Screen

Readers received source evidence and the proposed contract, but not the author rationale, engine score, prediction, or the other verdict.

| candidate | reader | provider/model | verdict | non-pass dimensions | reported cost |
|---|---|---|---|---|---:|
| `waf-semantic-complexity-repair` | reader-a | openai/gpt-5.6-sol | kill | fairness:fail, cheap-probe falsifiability:uncertain | unpriced; 16,364 tokens |
| `waf-semantic-complexity-repair` | reader-b | openai/gpt-5.6-sol | kill | fairness:fail, natural task contract:uncertain, structural witness isolation:uncertain, semantic novelty:uncertain, cheap-probe falsifiability:uncertain | unpriced; 16,253 tokens |

The two reads are independent sessions from one provider family. They count for candidate screening under the registration, but not for cross-provider root-cause agreement or capability evidence.

## Cheap Probes

| candidate | probe | result | B6 usable | mechanism active | witness isolated | reason |
|---|---|---|---|---|---|---|
| `waf-semantic-complexity-repair` | `deterministic-regex-complexity` | not-run | no | no | no | Stopped after reader rejection. |

The resource-complexity probe uses deterministic abstract work, not wall time. Its same invocation
grades a known-good implementation, a functional-only known-bad implementation, and malformed
input. A probe survivor proves a falsifiable mechanism can be packaged; it does not prove an agent
will make the error.

## Method Comparison

| method | systems/source units | drafts | reader survivors | probe survivors | novel survivors | domains | failure axes | reads / recorded tokens | priced + unpriced cost | claim boundary |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| evidence-mined-v2 | 4 | 2 | 0/1 | 0/0 | 0 | 2 | 2 | 2 / 32,617 | $0.00 + 4 bounded source units; 2 unpriced independent reads | Prospective source-to-probe yield only; no agent difficulty or shipped-family claim. |
| transfer-based | 3 | 3 | 0/0 | 3/3 | 0 | 3 | 1 | 8 / unrecorded | $1.99 + 4 unpriced agent attempts | Three local mutant transfers survived, but 8/8 countable agents solved and strict axis novelty is zero. |
| boundary-first | 3 | 1 | 0/1 | 0/0 | 0 | 1 | 1 | 2 / unrecorded | $0.00 + 8 documents / 18 sections | Registered search: one draft, killed by both readers, zero survivors. |
| author-generation | 0 | 5 | 0/5 | 0/0 | 0 | 5 | 1 | 7 / unrecorded | $0.00 + Seven independent reads (three for the Phase 8 candidate, one each for four Phase 9 candidates); generation time was not measured. | Historical 0-for-5: every author-generated candidate lacked a structural witness boundary. |

Transfer-based discovery has the strongest local activation record and the weakest agent result:
all eight countable Phase 14 attempts solved. Boundary-first search and author generation remain
zero-yield under independent reading. V2 is the first route allowed to claim prospective discovery
only if its candidate survives both the reader and probe gates. Retrospective outbox recovery is
excluded from every yield numerator.

## Corrections And Limits

- The Phase 15 preregistration used the source-repo shorthand results/34; the audited artifact is results/34-cc267-standard-matrix.md, pinned in the source corpus without changing the registration.
- TASK-FAMILY-MODEL.md simultaneously called the outbox ACKED rule hidden-only and already visible. The corrected classification is fragile A2: positively derivable across two sections, then made explicit by the measured one-sentence repair.
- The Phase 12 operator ledger said starter and activation effects had no agent measurement. Phase 14 has now measured descriptive nulls; local mutant activation remains real, but positive agent effect is not established.
- The official rs-archive-clone artifact has a 16-hour expert estimate and detailed verifier, but no countable agent matrix in either audited repository. It is retained as precedent and rejected from promotion in this run.
- Phase 14's 8/8 clean solves make the measured operator ranking empty. Discovery V2 gives the recompute recipe zero uplift rather than inheriting its local mutant effect as frontier difficulty.
- Both Phase 15 readers killed the only queued candidate at fairness because its packet named the need for public semantics and a deterministic budget without instantiating either one. This is a drafting-layer gate defect, not a failure of the incident evidence and not agent-difficulty evidence.
- The first method-comparison draft equated five author-generated candidates with five model reads. The audited evidence is three Phase 8 reads plus four Phase 9 reads, so the generated comparison now records seven.
- The first comparison counted all four extracted V2 patterns as failure-axis breadth while other methods counted drafted candidates. The table now uses draft-level breadth for every method and reports domain breadth separately.
- The first local-source adapter validated digest shape but not source bytes. It now byte-verifies both local documents and the checked-in first-party incident snapshot; the reader packet content and hash did not change.
- The first semantic-dedup implementation treated any candidate mined from an existing-family trial as a duplicate. It now requires an explicit same-axis and same-action-contract equivalence record, preventing a family id from hiding a new failure mode.
- The preregistration's declared midnight timestamp predates its own baseline commit, and the source corpus initially carried a future 13:00 placeholder. Neither is valid chronology evidence. The corpus timestamp is now null; the sealed preregistration remains unchanged, and prospective ordering is claimed only from this execution transcript, not as independently timestamp-proven by the repo.
- Source snapshots preserve content addresses and evidence facts, not full copyrighted upstream
  pages. Report regeneration is offline and cannot silently ingest a changed web page.
- An authoritative incident is evidence that the failure occurred, not evidence that a benchmark
  task built from it will be difficult for current agents.
- Candidate screening used no paid subject trials. The next task-family build must be timed from
  scratch; descendantBuildHours remains quarantined.

## Recommendation

This is still a screening instrument today. Before another corpus run, add a candidate-contract
gate that requires the public grammar, accepted semantics, deterministic meter, numeric budget,
hidden-instance envelope and threshold derivation. Do not repair and retest this candidate inside
the completed run; a repaired proposal belongs in a new preregistration. Continue bounded evidence
mining and selective builds, not bulk production, until a prospective candidate survives both
reading and a probe.

## Verification Scope

Phase 15 owns focused schema, adapter, semantic-dedup, blinding, scoring and B6 tests plus
typecheck/lint/build. The repository-wide long-running gate remains on the operator's periodic
cadence; this report does not turn a deferred global rerun into a claimed pass.
