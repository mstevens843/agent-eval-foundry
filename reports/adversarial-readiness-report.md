# Adversarial verifier-integrity readiness

Adversarial readiness asks whether the verifier can be attacked under a declared threat model.
It is separate from package leak checks, mutant detection, model difficulty and human solvability.

Cheat resistance is not the same claim as no bypass found. Cheat resistance is the design requirement; adversarial audit is the attempted exploit record.

| family | readiness | package hash | campaign | bundle | blockers |
|---|---|---|---|---|---|
| `caa-revalidation` | **audit-pending** | `cbb41af034435cec75810117377febcb` | none | none | `campaign-file-present`, `campaign-hash-current`, `threat-model-declared`, `access-boundary-declared`, `outcome-contract-declared`, `never-counts-declared`, `attack-bundle-present`, `fs-sandbox-isolation-check`, `exploit-schema-present` |
| `checker-required-memory-poisoning` | **audit-pending** | `0530fe3b520faaddd9ad7ed8742825cc` | `checker-required-memory-poisoning-adversarial` | `bundles/checker-required-memory-poisoning-adversarial` | `campaign-hash-current` |
| `dao-descendant` | **audit-pending** | `bbb02380b6f8633fec7bc0e9d2956ec1` | `dao-descendant-adversarial` | `bundles/dao-descendant-adversarial` | `campaign-hash-current` |
| `delegated-wallet-scope-reconciliation` | **audit-pending** | `0a9b26f37d40e87f67a5f755d79a0a85` | `delegated-wallet-scope-reconciliation-adversarial` | `bundles/delegated-wallet-scope-reconciliation-adversarial` | `campaign-hash-current` |
| `deployment-model-alias-rollout-drift` | **audit-pending** | `5b3171584b8a190743067d745b22e586` | `deployment-model-alias-rollout-drift-adversarial` | `bundles/deployment-model-alias-rollout-drift-adversarial` | `campaign-hash-current` |
| `deployment-rollback-recompute` | **audit-pending** | `46ed5ea45b412e242ef362fde040051a` | `deployment-rollback-recompute-adversarial` | `bundles/deployment-rollback-recompute-adversarial` | `campaign-hash-current` |
| `durable-approval-outbox` | **audit-pending** | none | none | none | `public-package-present`, `package-leak-check`, `campaign-file-present`, `threat-model-declared`, `access-boundary-declared`, `outcome-contract-declared`, `never-counts-declared` |
| `prompt-injection-containment` | **audit-pending** | `bbc682395fdc508b829d19e908def046` | `prompt-injection-containment-adversarial` | `bundles/prompt-injection-containment-adversarial` | `campaign-hash-current` |
| `prompt-injection-memory-poisoning` | **audit-pending** | `14870e7a6999848e888db374fede18b3` | `prompt-injection-memory-poisoning-adversarial` | `bundles/prompt-injection-memory-poisoning-adversarial` | `campaign-hash-current` |
| `trading-reconciliation-recompute` | **audit-pending** | `61183c46b73606ef156ea9121d3b0308` | `trading-reconciliation-recompute-adversarial` | `bundles/trading-reconciliation-recompute-adversarial` | `campaign-hash-current` |
| `ui-action-record-replay` | **audit-pending** | `9b00f533f3fd08718ddb96394f92fa48` | `ui-action-record-replay-adversarial` | `bundles/ui-action-record-replay-adversarial` | `campaign-hash-current` |
| `ui-replay-live-dom` | **audit-pending** | `b79ba7c2d564aa9b83775bfe064c2f78` | `ui-replay-live-dom-adversarial` | `bundles/ui-replay-live-dom-adversarial` | `campaign-hash-current` |

## Current Reading

Adversarial-ready families: none.
Audit-pending families: `caa-revalidation`, `checker-required-memory-poisoning`, `dao-descendant`, `delegated-wallet-scope-reconciliation`, `deployment-model-alias-rollout-drift`, `deployment-rollback-recompute`, `durable-approval-outbox`, `prompt-injection-containment`, `prompt-injection-memory-poisoning`, `trading-reconciliation-recompute`, `ui-action-record-replay`, `ui-replay-live-dom`.

A ready verdict means the attack campaign is prepared and hash-pinned. It does not mean anyone
has tried to exploit the verifier, and it does not mean no bypass exists.

## Audit Checks

### `caa-revalidation`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in challenge package hashes to cbb41af034435cec75810117377febcb |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | **FAIL** | no adversarial campaign file is checked in |
| `campaign-hash-current` | **FAIL** | campaign hash none / current cbb41af034435cec75810117377febcb |
| `threat-model-declared` | **FAIL** | campaign must declare the attack surface |
| `access-boundary-declared` | **FAIL** | allowed/forbidden attacker access boundary is incomplete |
| `outcome-contract-declared` | **FAIL** | campaign must define what counts as bypass and no-bypass |
| `never-counts-declared` | **FAIL** | campaign never-counts list is incomplete |
| `attack-bundle-present` | **FAIL** | prepared adversarial bundle missing |
| `fs-sandbox-isolation-check` | **FAIL** | no attack bundle to inspect |
| `exploit-schema-present` | **FAIL** | no attack bundle to inspect |

### `checker-required-memory-poisoning`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in challenge package hashes to 0530fe3b520faaddd9ad7ed8742825cc |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign checker-required-memory-poisoning-adversarial |
| `campaign-hash-current` | **FAIL** | campaign hash 448f2f816c51030cc97a374816226168 / current 0530fe3b520faaddd9ad7ed8742825cc |
| `threat-model-declared` | pass | 11 attack surface(s) |
| `access-boundary-declared` | pass | allowed and forbidden attacker access are both declared |
| `outcome-contract-declared` | pass | bypass and no-bypass outcomes are declared separately |
| `never-counts-declared` | pass | refusal, infrastructure errors and stale hashes never count |
| `attack-bundle-present` | pass | bundle ./bundles/checker-required-memory-poisoning-adversarial |
| `fs-sandbox-isolation-check` | pass | bundle declares fs-sandbox and leaks no hidden files |
| `exploit-schema-present` | pass | exploit artifact schema is included in the attack packet |

### `dao-descendant`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in challenge package hashes to bbb02380b6f8633fec7bc0e9d2956ec1 |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign dao-descendant-adversarial |
| `campaign-hash-current` | **FAIL** | campaign hash 9d89b49307a960f65f2e6e8f204fd15e / current bbb02380b6f8633fec7bc0e9d2956ec1 |
| `threat-model-declared` | pass | 12 attack surface(s) |
| `access-boundary-declared` | pass | allowed and forbidden attacker access are both declared |
| `outcome-contract-declared` | pass | bypass and no-bypass outcomes are declared separately |
| `never-counts-declared` | pass | refusal, infrastructure errors and stale hashes never count |
| `attack-bundle-present` | pass | bundle ./bundles/dao-descendant-adversarial |
| `fs-sandbox-isolation-check` | pass | bundle declares fs-sandbox and leaks no hidden files |
| `exploit-schema-present` | pass | exploit artifact schema is included in the attack packet |

### `delegated-wallet-scope-reconciliation`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in challenge package hashes to 0a9b26f37d40e87f67a5f755d79a0a85 |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign delegated-wallet-scope-reconciliation-adversarial |
| `campaign-hash-current` | **FAIL** | campaign hash 45f27b644a84364e3d3855f68cd243a2 / current 0a9b26f37d40e87f67a5f755d79a0a85 |
| `threat-model-declared` | pass | 12 attack surface(s) |
| `access-boundary-declared` | pass | allowed and forbidden attacker access are both declared |
| `outcome-contract-declared` | pass | bypass and no-bypass outcomes are declared separately |
| `never-counts-declared` | pass | refusal, infrastructure errors and stale hashes never count |
| `attack-bundle-present` | pass | bundle ./bundles/delegated-wallet-scope-reconciliation-adversarial |
| `fs-sandbox-isolation-check` | pass | bundle declares fs-sandbox and leaks no hidden files |
| `exploit-schema-present` | pass | exploit artifact schema is included in the attack packet |

### `deployment-model-alias-rollout-drift`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in challenge package hashes to 5b3171584b8a190743067d745b22e586 |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign deployment-model-alias-rollout-drift-adversarial |
| `campaign-hash-current` | **FAIL** | campaign hash 805efb58c923f9e081db1b41967392d7 / current 5b3171584b8a190743067d745b22e586 |
| `threat-model-declared` | pass | 12 attack surface(s) |
| `access-boundary-declared` | pass | allowed and forbidden attacker access are both declared |
| `outcome-contract-declared` | pass | bypass and no-bypass outcomes are declared separately |
| `never-counts-declared` | pass | refusal, infrastructure errors and stale hashes never count |
| `attack-bundle-present` | pass | bundle ./bundles/deployment-model-alias-rollout-drift-adversarial |
| `fs-sandbox-isolation-check` | pass | bundle declares fs-sandbox and leaks no hidden files |
| `exploit-schema-present` | pass | exploit artifact schema is included in the attack packet |

### `deployment-rollback-recompute`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in challenge package hashes to 46ed5ea45b412e242ef362fde040051a |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign deployment-rollback-recompute-adversarial |
| `campaign-hash-current` | **FAIL** | campaign hash 2ddfad2fd3287f752c41a408184b48ce / current 46ed5ea45b412e242ef362fde040051a |
| `threat-model-declared` | pass | 12 attack surface(s) |
| `access-boundary-declared` | pass | allowed and forbidden attacker access are both declared |
| `outcome-contract-declared` | pass | bypass and no-bypass outcomes are declared separately |
| `never-counts-declared` | pass | refusal, infrastructure errors and stale hashes never count |
| `attack-bundle-present` | pass | bundle ./bundles/deployment-rollback-recompute-adversarial |
| `fs-sandbox-isolation-check` | pass | bundle declares fs-sandbox and leaks no hidden files |
| `exploit-schema-present` | pass | exploit artifact schema is included in the attack packet |

### `durable-approval-outbox`

| check | result | detail |
|---|---|---|
| `public-package-present` | **FAIL** | no checked-in public challenge package is available here |
| `package-leak-check` | **FAIL** | no generated package split can be audited |
| `campaign-file-present` | **FAIL** | no adversarial campaign file is checked in |
| `campaign-hash-current` | n/a | campaign hash none / current none |
| `threat-model-declared` | **FAIL** | campaign must declare the attack surface |
| `access-boundary-declared` | **FAIL** | allowed/forbidden attacker access boundary is incomplete |
| `outcome-contract-declared` | **FAIL** | campaign must define what counts as bypass and no-bypass |
| `never-counts-declared` | **FAIL** | campaign never-counts list is incomplete |
| `attack-bundle-present` | n/a | prepared adversarial bundle missing |
| `fs-sandbox-isolation-check` | n/a | no attack bundle to inspect |
| `exploit-schema-present` | n/a | no attack bundle to inspect |

### `prompt-injection-containment`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in challenge package hashes to bbc682395fdc508b829d19e908def046 |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign prompt-injection-containment-adversarial |
| `campaign-hash-current` | **FAIL** | campaign hash 4911ffdfbd2c0e9b51752ed16c4f53e8 / current bbc682395fdc508b829d19e908def046 |
| `threat-model-declared` | pass | 11 attack surface(s) |
| `access-boundary-declared` | pass | allowed and forbidden attacker access are both declared |
| `outcome-contract-declared` | pass | bypass and no-bypass outcomes are declared separately |
| `never-counts-declared` | pass | refusal, infrastructure errors and stale hashes never count |
| `attack-bundle-present` | pass | bundle ./bundles/prompt-injection-containment-adversarial |
| `fs-sandbox-isolation-check` | pass | bundle declares fs-sandbox and leaks no hidden files |
| `exploit-schema-present` | pass | exploit artifact schema is included in the attack packet |

### `prompt-injection-memory-poisoning`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in challenge package hashes to 14870e7a6999848e888db374fede18b3 |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign prompt-injection-memory-poisoning-adversarial |
| `campaign-hash-current` | **FAIL** | campaign hash 7443bf6d6c6b2ccf69cc20f417ff048c / current 14870e7a6999848e888db374fede18b3 |
| `threat-model-declared` | pass | 11 attack surface(s) |
| `access-boundary-declared` | pass | allowed and forbidden attacker access are both declared |
| `outcome-contract-declared` | pass | bypass and no-bypass outcomes are declared separately |
| `never-counts-declared` | pass | refusal, infrastructure errors and stale hashes never count |
| `attack-bundle-present` | pass | bundle ./bundles/prompt-injection-memory-poisoning-adversarial |
| `fs-sandbox-isolation-check` | pass | bundle declares fs-sandbox and leaks no hidden files |
| `exploit-schema-present` | pass | exploit artifact schema is included in the attack packet |

### `trading-reconciliation-recompute`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in challenge package hashes to 61183c46b73606ef156ea9121d3b0308 |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign trading-reconciliation-recompute-adversarial |
| `campaign-hash-current` | **FAIL** | campaign hash 94bfc2c401ad2cc19f7e84e8a1270a08 / current 61183c46b73606ef156ea9121d3b0308 |
| `threat-model-declared` | pass | 12 attack surface(s) |
| `access-boundary-declared` | pass | allowed and forbidden attacker access are both declared |
| `outcome-contract-declared` | pass | bypass and no-bypass outcomes are declared separately |
| `never-counts-declared` | pass | refusal, infrastructure errors and stale hashes never count |
| `attack-bundle-present` | pass | bundle ./bundles/trading-reconciliation-recompute-adversarial |
| `fs-sandbox-isolation-check` | pass | bundle declares fs-sandbox and leaks no hidden files |
| `exploit-schema-present` | pass | exploit artifact schema is included in the attack packet |

### `ui-action-record-replay`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in challenge package hashes to 9b00f533f3fd08718ddb96394f92fa48 |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign ui-action-record-replay-adversarial |
| `campaign-hash-current` | **FAIL** | campaign hash 1050e79f4804a96a5327d50dd81765b0 / current 9b00f533f3fd08718ddb96394f92fa48 |
| `threat-model-declared` | pass | 11 attack surface(s) |
| `access-boundary-declared` | pass | allowed and forbidden attacker access are both declared |
| `outcome-contract-declared` | pass | bypass and no-bypass outcomes are declared separately |
| `never-counts-declared` | pass | refusal, infrastructure errors and stale hashes never count |
| `attack-bundle-present` | pass | bundle ./bundles/ui-action-record-replay-adversarial |
| `fs-sandbox-isolation-check` | pass | bundle declares fs-sandbox and leaks no hidden files |
| `exploit-schema-present` | pass | exploit artifact schema is included in the attack packet |

### `ui-replay-live-dom`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in challenge package hashes to b79ba7c2d564aa9b83775bfe064c2f78 |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign ui-replay-live-dom-adversarial |
| `campaign-hash-current` | **FAIL** | campaign hash 18c3f5afc5973604205cd7df23ce4cad / current b79ba7c2d564aa9b83775bfe064c2f78 |
| `threat-model-declared` | pass | 12 attack surface(s) |
| `access-boundary-declared` | pass | allowed and forbidden attacker access are both declared |
| `outcome-contract-declared` | pass | bypass and no-bypass outcomes are declared separately |
| `never-counts-declared` | pass | refusal, infrastructure errors and stale hashes never count |
| `attack-bundle-present` | pass | bundle ./bundles/ui-replay-live-dom-adversarial |
| `fs-sandbox-isolation-check` | pass | bundle declares fs-sandbox and leaks no hidden files |
| `exploit-schema-present` | pass | exploit artifact schema is included in the attack packet |

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
