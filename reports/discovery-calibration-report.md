# Discovery Calibration

This is a directional backtest of Discovery Workbench scoring against six known family outcomes.
It is n=6 local calibration, not a statistical estimate of benchmark yield.

The question is whether the scoring model would have routed known families toward the right next
evidence tier: build, evolve, transfer, repair or kill. It does not create new model evidence.

## Summary

| item | value |
|---|---:|
| calibration rows | 6 |
| matches | 4 |
| partials | 2 |
| misses | 0 |

n=6 local backtest. It calibrates routing pressure only; it is not a statistical estimate of benchmark yield.

## Backtest Rows

| family | retrofit candidate | score | recommended action | actual outcome | match | probe evidence |
|---|---|---:|---|---|---|---|
| `durable-approval-outbox` | `payment-unknown-capture-receipt` | 63.1 | mechanism_probe | shipped historical family; real agents failed; reference passed | match | promote_to_task_shape |
| `prompt-injection-containment` | `prompt-injection-doc-retrieval-policy` | 72.0 | evolve_existing | already solved by real agents; killed as the base family | match | not-run |
| `prompt-injection-memory-poisoning` | `memory-poisoned-cross-session-approval` | 76.1 | transfer_existing | confirmed harder; cross-lab failure generalised | match | transfer_existing |
| `ui-action-record-replay` | `browser-checkout-stale-selector` | 65.9 | task_shape | shipped as useful but real-agent failures form a one-axis chain | partial | evolve_existing |
| `ui-replay-live-dom` | `browser-aria-busy-false-ready` | 69.1 | task_shape | stronger DOM-like descendant with OpenAI difficulty evidence; not cross-lab | match | not-run |
| `checker-required-memory-poisoning` | `checker-required-ui-replay` | 63.1 | hold | OpenAI difficulty evidence for checker-required memory descendant; not cross-lab | partial | not-run |

## What The Model Overvalued

- `durable-approval-outbox`: difficulty under non-low fairness risk
- `prompt-injection-containment`: static prompt-injection difficulty before the smoke trial
- `prompt-injection-memory-poisoning`: none identified in this small calibration set
- `ui-action-record-replay`: scenario count before checking whether failure sets form a chain; difficulty under non-low fairness risk
- `ui-replay-live-dom`: difficulty under non-low fairness risk
- `checker-required-memory-poisoning`: difficulty under non-low fairness risk

## What The Model Undervalued

- `durable-approval-outbox`: declared transfer from a measured family
- `prompt-injection-containment`: declared transfer from a measured family
- `prompt-injection-memory-poisoning`: declared transfer from a measured family; authority-model reuse across domains
- `ui-action-record-replay`: declared transfer from a measured family
- `ui-replay-live-dom`: declared transfer from a measured family
- `checker-required-memory-poisoning`: checker-required value when attached to an existing strong authority model; declared transfer from a measured family

## Scoring Adjustments

- Boost candidates whose cheap probes catch multiple distinct bad subjects by intended named checks.
- Penalize high expected difficulty when verifier feasibility or hidden-rule fairness is weak.
- Penalize likely nested failure sets before buying a full matrix.
- Boost candidates that reuse an already shipped authority model through a declared transfer.
- Preserve one-agent smoke trial as the first real difficulty gate; score alone must not ship.

## Row Notes

### durable-approval-outbox

Expected route: promote to task shape/family.

Evidence label: imported historical difficulty evidence.

Candidate features: `mechanisms=uncertain-external-effects+duplicate-side-effects+false-audit-history`, `truth=processor settlement ledger`, `knobs=2`, `mutants=3`, `buildHours=18`, `axisPotential=4`, `fairnessRisk=medium`, `verifierRisk=medium`, `alreadySolvedRisk=medium`.

Calibration note: Probe evidence should dominate raw score in the next-action queue.

### prompt-injection-containment

Expected route: kill or harden after smoke trial.

Evidence label: current-family killed outcome.

Candidate features: `mechanisms=prompt-injection-via-retrieval+context-contamination+permission-boundary`, `truth=policy source registry`, `knobs=2`, `mutants=3`, `buildHours=14`, `axisPotential=3`, `fairnessRisk=low`, `verifierRisk=low`, `alreadySolvedRisk=high`.

Calibration note: Keep the one-agent smoke gate before any production matrix; already-solved outcomes cannot be predicted from prompt-surface plausibility alone.

### prompt-injection-memory-poisoning

Expected route: promote/evolve from containment.

Evidence label: counted real-agent difficulty and cross-lab transfer.

Candidate features: `mechanisms=prompt-injection-via-retrieval+context-contamination+permission-boundary`, `truth=memory provenance ledger`, `knobs=2`, `mutants=3`, `buildHours=12`, `axisPotential=3`, `fairnessRisk=low`, `verifierRisk=low`, `alreadySolvedRisk=medium`.

Calibration note: Probe evidence should dominate raw score in the next-action queue.

### ui-action-record-replay

Expected route: build but watch for axis collapse.

Evidence label: counted real-agent difficulty with axis limitation.

Candidate features: `mechanisms=ui-replay-mismatch+stale-state+duplicate-side-effects`, `truth=browser harness effect ledger`, `knobs=2`, `mutants=3`, `buildHours=28`, `axisPotential=5`, `fairnessRisk=medium`, `verifierRisk=medium`, `alreadySolvedRisk=low`.

Calibration note: Probe evidence should dominate raw score in the next-action queue.

### ui-replay-live-dom

Expected route: descendant/hardened UI replay.

Evidence label: OpenAI-only counted real-agent difficulty.

Candidate features: `mechanisms=ui-replay-mismatch+tool-result-ambiguity+liveness-stall`, `truth=browser precondition ledger`, `knobs=2`, `mutants=3`, `buildHours=22`, `axisPotential=4`, `fairnessRisk=medium`, `verifierRisk=medium`, `alreadySolvedRisk=low`.

Calibration note: No weight change required from this row.

### checker-required-memory-poisoning

Expected route: checker-required descendant.

Evidence label: OpenAI-only counted real-agent difficulty.

Candidate features: `mechanisms=checker-quality-gap+ui-replay-mismatch+false-audit-history`, `truth=hidden replay trace bank`, `knobs=2`, `mutants=3`, `buildHours=24`, `axisPotential=5`, `fairnessRisk=medium`, `verifierRisk=high`, `alreadySolvedRisk=low`.

Calibration note: Do not over-penalize checker-required descendants when the underlying authority model is already measured.

## Evidence Boundaries

- Calibration is directional because the local known-outcome set has only six rows.
- A matched recommendation does not prove the next candidate is hard.
- A miss is useful evidence about routing pressure, not a reason to hide the row.
- Probe evidence can update the queue, but still remains below task-family and real-agent evidence.

---

Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.
