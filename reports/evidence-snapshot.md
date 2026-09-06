# Evidence snapshot

One row per family in the registry. Every cell is read off the same evidence maps the ship gate
reads — `familyEvidenceMapForShipReport`, the human and verifier-integrity gate maps, the task
shape and the evidence ledger — and the verdict column is `assessFamily` itself, so a row here
cannot disagree with `reports/ship-recommendation.md`. Nothing in this document is recomputed and
nothing is typed by hand.

Two columns are routinely confused and are kept apart. **measured axes** is over the MUTANT bank:
how many independent defects the verifier is known to detect, bounded by how many known-bad
implementations someone wrote. **agent axes** is over counted agent trials: how many directions
real subjects actually fail in. A family can score nineteen of the first and none of the second.

`counted trials` counts only agent trials that count — an agent subject, `counts: true`, and a
status that is not a refusal, infrastructure error or other never-counting outcome — measured
against the challenge package the family produces today. A trial run against a package that has
since changed is superseded, preserved, and not in this column.

## Snapshot

| family | scenarios | counted trials | failed >=1 | capability-attributed | measured axes (mutant bank) | agent axes | human claim | verifier integrity | verdict |
|---|---:|---:|---:|---:|---:|---|---|---|---|
| `access-token-scope-expansion` | 384 | 0 | 0 | 0 | 3 | not measurable — fewer than 2 counted failing subjects | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `bypass-status-unknown`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `audit-truth-financial-workflow` | not built | — | — | — | — | — | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `ambiguity-status-unknown`, `bypass-status-unknown`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `browser-action-replay` | not built | — | — | — | — | — | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `ambiguity-status-unknown`, `bypass-status-unknown`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `caa-revalidation` | 24 | 0 | 0 | 0 | 3 | not measurable — fewer than 2 counted failing subjects | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `checker-required-memory-poisoning` | 792 | 0 | 0 | 0 | 12 | not measurable — fewer than 2 counted failing subjects | human-ready | audit-pending | **NOT-READY**: `content-verified-package-missing`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `dao-descendant` | 24 | 0 | 0 | 0 | 1 | not measurable — fewer than 2 counted failing subjects | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `delegated-wallet-scope-reconciliation` | 804 | 0 | 0 | 0 | 3 | not measurable — fewer than 2 counted failing subjects | human-ready | audit-pending | **NOT-READY**: `content-verified-package-missing`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `deployment-model-alias-rollout-drift` | 339 | 0 | 0 | 0 | 20 | not measurable — fewer than 2 counted failing subjects | human-ready | audit-pending | **NOT-READY**: `content-verified-package-missing`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `deployment-rollback-partial-effects` | not built | — | — | — | — | — | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `ambiguity-status-unknown`, `bypass-status-unknown`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `deployment-rollback-recompute` | 24 | 0 | 0 | 0 | 1 | not measurable — fewer than 2 counted failing subjects | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `durable-approval-outbox` | not built | 6 | 6 | 0 | 3 | 1 (failures nest — one axis at several sensitivities) | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `model-alias-drift-sentinel` | not built | — | — | — | 2 (est.) | — | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `ambiguity-status-unknown`, `bypass-status-unknown`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `permission-boundary-tools` | not built | — | — | — | 1 (est.) | — | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `ambiguity-status-unknown`, `bypass-status-unknown`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `prompt-injection-approval-scope-drift` | not built | — | — | — | 3 (est.) | — | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `ambiguity-status-unknown`, `bypass-status-unknown`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `prompt-injection-capability-routing` | not built | — | — | — | 3 (est.) | — | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `ambiguity-status-unknown`, `bypass-status-unknown`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `prompt-injection-containment` | 128 | 0 | 0 | 0 | 4 | not measurable — fewer than 2 counted failing subjects | human-ready | audit-pending | **NOT-READY**: `content-verified-package-missing`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `prompt-injection-cross-tool-escalation` | not built | — | — | — | 3 (est.) | — | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `ambiguity-status-unknown`, `bypass-status-unknown`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `prompt-injection-memory-poisoning` | 864 | 0 | 0 | 0 | 8 | not measurable — fewer than 2 counted failing subjects | human-ready | audit-pending | **NOT-READY**: `content-verified-package-missing`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `stale-crm-ticket-automation` | not built | — | — | — | 2 (est.) | — | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `ambiguity-status-unknown`, `bypass-status-unknown`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `trading-reconciliation-recompute` | 24 | 0 | 0 | 0 | 1 | not measurable — fewer than 2 counted failing subjects | reference-solvable | audit-pending | **NOT-READY**: `content-verified-package-missing`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `ui-action-record-replay` | 324 | 0 | 0 | 0 | 4 | not measurable — fewer than 2 counted failing subjects | human-ready | audit-pending | **NOT-READY**: `content-verified-package-missing`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |
| `ui-replay-live-dom` | 864 | 0 | 0 | 0 | 19 | not measurable — fewer than 2 counted failing subjects | human-ready | audit-pending | **NOT-READY**: `content-verified-package-missing`, `required-reference`, `required-positiveWork`, `required-nearMissControls`, `required-contractReviewed`, `required-publicPackageComplete`, `required-protectedGrading`, `required-localIntegrityControls`, `required-boundedSolveEvidence`, `no-qualified-capability-failure`, `required-destinationChecks`, `not-destination-professional-package`, `exact-two-target-profiles-missing` |

`not built` means the family is declared as a task shape and has no executable sweep, so it has
no measured scenario count, no mutant run and no evidence of any kind beyond what it claims.
The verdict for such a family is still real: a blocking gate that reads `n/a` does not pass.

## Current challenge packages

The hash a trial must carry to count. It is a pure function of the package the family produces
now, so it moves whenever the package moves — which is exactly why it may not be transcribed
anywhere by hand.

| family | current package hash | counted | superseded |
|---|---|---:|---:|
| `access-token-scope-expansion` | `449d7f9a570517fe168dc12a24da0d6d` | 0 | 1 |
| `caa-revalidation` | `cbb41af034435cec75810117377febcb` | 0 | 4 |
| `checker-required-memory-poisoning` | `0530fe3b520faaddd9ad7ed8742825cc` | 0 | 1 |
| `dao-descendant` | `bbb02380b6f8633fec7bc0e9d2956ec1` | 0 | 2 |
| `delegated-wallet-scope-reconciliation` | `0a9b26f37d40e87f67a5f755d79a0a85` | 0 | 1 |
| `deployment-model-alias-rollout-drift` | `5b3171584b8a190743067d745b22e586` | 0 | 2 |
| `deployment-rollback-recompute` | `46ed5ea45b412e242ef362fde040051a` | 0 | 2 |
| `prompt-injection-containment` | `bbc682395fdc508b829d19e908def046` | 0 | 6 |
| `prompt-injection-memory-poisoning` | `14870e7a6999848e888db374fede18b3` | 0 | 11 |
| `trading-reconciliation-recompute` | `61183c46b73606ef156ea9121d3b0308` | 0 | 2 |
| `ui-action-record-replay` | `9b00f533f3fd08718ddb96394f92fa48` | 0 | 5 |
| `ui-replay-live-dom` | `b79ba7c2d564aa9b83775bfe064c2f78` | 0 | 1 |

Repo-wide across package-backed families: **0 counted**, 38 superseded.

## Imported historical evidence

The `durable-approval-outbox` bank is imported from archived runs rather than executed here, so it is a
separate stream and never enters the counted-agent-trial column above. Full accounting, including
why each excluded run is excluded, is in `reports/historical-durable-outbox-trials.md`.

| | |
|---|---:|
| run directories parsed | 33 |
| counted | **0** |
| of those, failed >=1 scenario | 0 |
| uncounted | 33 |
| excluded for running a different task | 7 |

## Production routing

Families carrying a production-readiness layer. `mixed cross-lab smoke` is the computed state
the README used to print as an invented `PROVIDER-DELTA` verdict; it is a routing fact, not a
ship verdict, and the ship verdict for these families is in the table above.

| family | production matrix | cross-lab smoke evidenced | mixed cross-lab smoke | provider-delta diagnosis | detail |
|---|---|---|---|---|---|
| `deployment-model-alias-rollout-drift` | no | no | no | yes | blocked; Resolve package blockers: content-verified-package-missing, ambiguity-status-unknown, required-reference, required-positiveWork, required-nearMissControls, required-contractReviewed, required-publicPackageComplete, required-protectedGrading, required-localIntegrityControls, required-boundedSolveEvidence |

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
