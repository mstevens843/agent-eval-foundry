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
| `access-token-scope-expansion` | 384 | 0 | 0 | 0 | 3 | not measurable — fewer than 2 counted failing subjects | reference-solvable | audit-pending | **NOT-READY**: `difficulty-evidenced`, `not-already-solved` |
| `audit-truth-financial-workflow` | not built | — | — | — | — | — | reference-solvable | audit-pending | **NOT-READY**: `difficulty-evidenced` |
| `browser-action-replay` | not built | — | — | — | — | — | reference-solvable | audit-pending | **NOT-READY**: `difficulty-evidenced` |
| `checker-required-memory-poisoning` | 792 | 1 | 1 | 0 | 12 | not measurable — fewer than 2 counted failing subjects | human-ready | adversarial-audited | **NOT-READY**: `difficulty-evidenced` |
| `dao-descendant` | 24 | 0 | 0 | 0 | 1 | not measurable — fewer than 2 counted failing subjects | reference-solvable | adversarial-ready | **NOT-READY**: `difficulty-evidenced` |
| `delegated-wallet-scope-reconciliation` | 804 | 0 | 0 | 0 | 3 | not measurable — fewer than 2 counted failing subjects | human-ready | adversarial-ready | **NOT-READY**: `difficulty-evidenced` |
| `deployment-model-alias-rollout-drift` | 339 | 0 | 0 | 0 | 20 | not measurable — fewer than 2 counted failing subjects | human-ready | adversarial-ready | **NOT-READY**: `difficulty-evidenced` |
| `deployment-rollback-partial-effects` | not built | — | — | — | — | — | reference-solvable | audit-pending | **NOT-READY**: `difficulty-evidenced` |
| `durable-approval-outbox` | not built | 6 | 6 | 0 | 3 | 1 (failures nest — one axis at several sensitivities) | reference-solvable | audit-pending | **NOT-READY**: `difficulty-evidenced` |
| `model-alias-drift-sentinel` | not built | — | — | — | 2 (est.) | — | reference-solvable | audit-pending | **NOT-READY**: `difficulty-evidenced` |
| `permission-boundary-tools` | not built | — | — | — | 1 (est.) | — | reference-solvable | audit-pending | **NOT-READY**: `difficulty-evidenced` |
| `prompt-injection-approval-scope-drift` | not built | — | — | — | 3 (est.) | — | reference-solvable | audit-pending | **NOT-READY**: `difficulty-evidenced` |
| `prompt-injection-capability-routing` | not built | — | — | — | 3 (est.) | — | reference-solvable | audit-pending | **NOT-READY**: `difficulty-evidenced` |
| `prompt-injection-containment` | 128 | 6 | 0 | 0 | 4 | not measurable — fewer than 2 counted failing subjects | human-ready | adversarial-ready | **NOT-READY**: `difficulty-evidenced`, `not-already-solved` |
| `prompt-injection-cross-tool-escalation` | not built | — | — | — | 3 (est.) | — | reference-solvable | audit-pending | **NOT-READY**: `difficulty-evidenced` |
| `prompt-injection-memory-poisoning` | 288 | 0 | 0 | 0 | 5 | not measurable — fewer than 2 counted failing subjects | human-ready | adversarial-ready | **NOT-READY**: `difficulty-evidenced` |
| `stale-crm-ticket-automation` | not built | — | — | — | 2 (est.) | — | reference-solvable | audit-pending | **NOT-READY**: `difficulty-evidenced` |
| `ui-action-record-replay` | 324 | 5 | 5 | 2 | 6 | 1 (failures nest — one axis at several sensitivities) | human-ready | adversarial-ready | **SHIP** |
| `ui-replay-live-dom` | 864 | 1 | 1 | 1 | 19 | not measurable — fewer than 2 counted failing subjects | human-ready | adversarial-audited | **SHIP** |

`not built` means the family is declared as a task shape and has no executable sweep, so it has
no measured scenario count, no mutant run and no evidence of any kind beyond what it claims.
The verdict for such a family is still real: a blocking gate that reads `n/a` does not pass.

## Current challenge packages

The hash a trial must carry to count. It is a pure function of the package the family produces
now, so it moves whenever the package moves — which is exactly why it may not be transcribed
anywhere by hand.

| family | current package hash | counted | superseded |
|---|---|---:|---:|
| `access-token-scope-expansion` | `8ae0950dea093d35d98b12d1c8c1bde5` | 0 | 1 |
| `checker-required-memory-poisoning` | `448f2f816c51030cc97a374816226168` | 1 | 0 |
| `dao-descendant` | `9d89b49307a960f65f2e6e8f204fd15e` | 0 | 0 |
| `delegated-wallet-scope-reconciliation` | `45f27b644a84364e3d3855f68cd243a2` | 0 | 1 |
| `deployment-model-alias-rollout-drift` | `805efb58c923f9e081db1b41967392d7` | 0 | 2 |
| `prompt-injection-containment` | `4911ffdfbd2c0e9b51752ed16c4f53e8` | 6 | 0 |
| `prompt-injection-memory-poisoning` | `7443bf6d6c6b2ccf69cc20f417ff048c` | 0 | 11 |
| `ui-action-record-replay` | `1050e79f4804a96a5327d50dd81765b0` | 5 | 0 |
| `ui-replay-live-dom` | `18c3f5afc5973604205cd7df23ce4cad` | 1 | 0 |

Repo-wide across package-backed families: **13 counted**, 15 superseded.

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
| `deployment-model-alias-rollout-drift` | no | no | no | yes | blocked; run or import one counted smoke trial under the current hash |

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
