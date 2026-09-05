# The foundry loop

A benchmark program is not a list of tasks; it is a process that produces tasks and discards most
of them. This report is the process, running.

## The loop, now closed again

| step | what happened | evidence |
|---|---|---|
| 1. build | `prompt-injection-containment` built end to end: 128 measured scenarios, 9 mutants, verifier | `reports/prompt-injection-containment-family-report.md` |
| 2. measure | 4 measured axes against the mutant bank | `reports/prompt-injection-containment-axis-report.md` |
| 3. trial | 3 counted Claude trials, subprocess isolation, artifacts preserved | `trials/prompt-injection-containment/` |
| 4. **kill** | all 3 passed 128/128 → `already_solved`, disposition `harden` | `reports/prompt-injection-containment-kill-analysis.md` |
| 5. evolve | 4 variants proposed from named operators | this report, below |
| 6. promote | `prompt-injection-memory-poisoning` built end to end | `reports/prompt-injection-memory-poisoning-family-report.md` |
| 7. measure | 3 measured axes; reference clean; every mutant caught | `reports/prompt-injection-memory-poisoning-axis-report.md` |
| 8. **trial** | 8 counted descendant trials; 5 failed, including the same 32 scenarios across two labs | `reports/prompt-injection-memory-poisoning-agent-results.md` |
| 9. detect | `ui-action-record-replay` shipped but its five counted failure sets form a chain | `reports/ui-action-record-replay-agent-diagnosis.md` |
| 10. evolve | `ui-replay-live-dom` adds mutable tree state and categorical anchor conflict | `reports/ui-replay-live-dom-report.md` |
| 11. package | leak-checked 9-file challenge package with a pinned hash | `reports/ui-replay-live-dom-challenge-package-report.md` |
| 12. **trial** | 1 counted Codex/OpenAI trial failed 219/864 live-DOM scenarios | `reports/ui-replay-live-dom-agent-results.md` |
| 13. promote | `access-token-scope-expansion` was built from the top executable probe | `reports/promotion-report.md` |
| 14. **smoke** | 1 counted OpenAI/Codex smoke passed 384/384 access-token scenarios | `reports/access-token-scope-expansion-agent-diagnosis.md` |
| 15. **route** | clean pass blocks `/6` matrix and triggers `already_solved_or_needs_evolution` | `reports/access-token-scope-expansion-kill-analysis.md` |
| 16. evolve | `delegated-wallet-scope-reconciliation` descendant probe was promoted into a full family | `reports/access-token-evolution-report.md` |
| 17. measure | delegated-wallet local sweep: 804 measured scenarios, clean reference, 10/10 mutants/baselines caught | `reports/delegated-wallet-scope-reconciliation-family-report.md` |
| 18. package | delegated-wallet 9-file challenge package is leak-checked and hash-pinned; one OpenAI smoke is planned | `reports/delegated-wallet-scope-reconciliation-trial-readiness.md` |

**The key correction is still the same:** mutant-detection axes and real-agent difficulty are
separate evidence streams. The live-DOM descendant now has both, while the delegated-wallet
descendant has local verifier/mutant/package evidence only until its smoke trial runs; cross-family
and cross-lab claims remain bounded by the shared bank.

## Where every family stands

| family | verdict | primary kill reason | disposition | axes | trials | built |
|---|---|---|---|---:|---:|---|
| `access-token-scope-expansion` | NOT-READY | `verifier_only` | `trial` | 3 | 0 | yes |
| `audit-truth-financial-workflow` | NOT-READY | `no_difficulty_evidence` | `trial` | — _(est.)_ | 0 | no |
| `browser-action-replay` | NOT-READY | `no_difficulty_evidence` | `trial` | — _(est.)_ | 0 | no |
| `caa-revalidation` | NOT-READY | `grader_gameable` | `repair` | 3 | 4 | yes |
| `checker-required-memory-poisoning` | NOT-READY | `grader_gameable` | `repair` | 12 | 1 | yes |
| `dao-descendant` | NOT-READY | `grader_gameable` | `repair` | 1 | 2 | yes |
| `delegated-wallet-scope-reconciliation` | NOT-READY | `verifier_only` | `trial` | 3 | 0 | yes |
| `deployment-model-alias-rollout-drift` | NOT-READY | `verifier_only` | `trial` | 20 | 0 | yes |
| `deployment-rollback-partial-effects` | NOT-READY | `no_difficulty_evidence` | `trial` | — _(est.)_ | 0 | no |
| `deployment-rollback-recompute` | NOT-READY | `grader_gameable` | `repair` | 1 | 2 | yes |
| `durable-approval-outbox` | NOT-READY | `grader_gameable` | `repair` | 3 | 6 | no |
| `model-alias-drift-sentinel` | NOT-READY | `no_difficulty_evidence` | `trial` | 2 _(est.)_ | 0 | no |
| `permission-boundary-tools` | NOT-READY | `no_difficulty_evidence` | `trial` | 1 _(est.)_ | 0 | no |
| `prompt-injection-approval-scope-drift` | NOT-READY | `no_difficulty_evidence` | `trial` | 3 _(est.)_ | 0 | no |
| `prompt-injection-capability-routing` | NOT-READY | `no_difficulty_evidence` | `trial` | 3 _(est.)_ | 0 | no |
| `prompt-injection-containment` | NOT-READY | `grader_gameable` | `repair` | 4 | 6 | yes |
| `prompt-injection-cross-tool-escalation` | NOT-READY | `no_difficulty_evidence` | `trial` | 3 _(est.)_ | 0 | no |
| `prompt-injection-memory-poisoning` | NOT-READY | `verifier_only` | `trial` | 5 | 0 | yes |
| `stale-crm-ticket-automation` | NOT-READY | `no_difficulty_evidence` | `trial` | 2 _(est.)_ | 0 | no |
| `trading-reconciliation-recompute` | NOT-READY | `grader_gameable` | `repair` | 1 | 2 | yes |
| `ui-action-record-replay` | NOT-READY | `grader_gameable` | `repair` | 6 | 5 | yes |
| `ui-replay-live-dom` | NOT-READY | `grader_gameable` | `repair` | 19 | 1 | yes |

12 of 22 families execute. 9 have been attempted by a real agent.

## What the kill taxonomy has actually found

Reasons with no families under them are as informative as the ones with families: a taxonomy where
every category fires is usually a taxonomy that is not discriminating.

| reason | kind | disposition | families |
|---|---|---|---|
| `already_solved` | weakness | `harden` | `caa-revalidation`, `dao-descendant`, `deployment-rollback-recompute`, `prompt-injection-containment`, `trading-reconciliation-recompute` |
| `verifier_only` | absence | `trial` | `access-token-scope-expansion`, `delegated-wallet-scope-reconciliation`, `deployment-model-alias-rollout-drift`, `prompt-injection-memory-poisoning` |
| `redundant_axis` | weakness | `mutate` | `dao-descendant`, `deployment-rollback-recompute`, `trading-reconciliation-recompute` |
| `unfair_hidden_rule` | defect | `repair` | — |
| `hidden_artifact_leak` | defect | `repair` | — |
| `no_mechanism_fire` | defect | `repair` | — |
| `no_reference_solution` | defect | `repair` | — |
| `no_mutant_discrimination` | defect | `repair` | — |
| `no_difficulty_evidence` | absence | `trial` | `audit-truth-financial-workflow`, `browser-action-replay`, `checker-required-memory-poisoning`, `deployment-rollback-partial-effects`, `durable-approval-outbox`, `model-alias-drift-sentinel`, `permission-boundary-tools`, `prompt-injection-approval-scope-drift`, `prompt-injection-capability-routing`, `prompt-injection-cross-tool-escalation`, `stale-crm-ticket-automation` |
| `too_synthetic` | weakness | `mutate` | `prompt-injection-containment` |
| `too_expensive` | cost | `split` | — |
| `runner_unavailable` | absence | `schedule` | — |
| `insufficient_shared_bank` | absence | `schedule` | `access-token-scope-expansion`, `caa-revalidation`, `checker-required-memory-poisoning`, `dao-descendant`, `delegated-wallet-scope-reconciliation`, `deployment-model-alias-rollout-drift`, `deployment-rollback-recompute`, `durable-approval-outbox`, `prompt-injection-memory-poisoning`, `trading-reconciliation-recompute`, `ui-replay-live-dom` |
| `grader_gameable` | defect | `repair` | `caa-revalidation`, `checker-required-memory-poisoning`, `dao-descendant`, `deployment-rollback-recompute`, `durable-approval-outbox`, `prompt-injection-containment`, `trading-reconciliation-recompute`, `ui-action-record-replay`, `ui-replay-live-dom` |
| `ambiguous_truth_source` | defect | `repair` | — |

## The variants this produced

_No family currently has a `harden` disposition, so no structural variants are proposed._

## Why the promoted variant was the one

`prompt-injection-memory-poisoning` carried the lowest pre-registered kill risk of the four, and
the rationale is specific rather than a preference: the parent's three passing submissions all
tracked provenance correctly *within a request*, where it costs nothing because the value never
leaves memory. None of them was ever asked to write provenance down and read it back. The
persistence boundary is the crutch they leaned on hardest, so removing it attacks the thing that
was actually load-bearing.

The other three each depend on a mechanism the parent's trials demonstrably handled — chained tool
authority, approval confusion — so their kill risk is higher for a reason the evidence supports.

## What promotion cost, and what it bought

| | |
|---|---:|
| parent family, build | ~70 h |
| parent family, trials | 3 counted runs, ~17 minutes of model time |
| the kill | one gate, zero additional spend |
| descendant, build | ~75 h |
| descendant, measured axes | 3 |
| memory descendant, counted trials | **8** |
| UI descendant, challenge package | 9 files, hash-pinned |
| UI descendant, counted trials | **1** |

The kill is the cheap part and the build is the expensive part, which is the entire argument for
gating before building rather than after. What these cycles demonstrate is that the gate can fire
on the author's own work, the next family can be built from the failure reason, and evidence can
be advanced without overwriting the parent family that produced it.

## Shared bank

4 subject(s) have attempted more than one family, against a threshold of 3.

Cross-family axis counts across every difficulty family are not available until that clears. The
live-DOM run added a descendant bank with one OpenAI subject; it strengthens the family but makes
the shared-bank claim narrower until additional subjects attempt the same package hash.

## What would falsify the loop

Stated in advance, because a process that cannot fail is a process that is not measuring anything:

1. **A descendant is also already-solved.** Counted trials passing every hidden scenario mean the
   operator did not produce difficulty against that bank.
2. **A descendant is unfair rather than hard.** Failures concentrated only on an ambiguous rule or
   host defect move the family to HOLD/REPAIR rather than difficulty-evidenced.
3. **The variants are indistinguishable.** If two evolved families produce the same catch sets on a
   shared bank, the operators are relabelling rather than diversifying.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
