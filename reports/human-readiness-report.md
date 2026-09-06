# Human readiness

Human-readiness asks whether the public package can be handed to an independent engineer without
hidden source, author memory or private hints. It is separate from reference solvability and from
model difficulty.

| family | human-readiness | package hash | visible files | blockers |
|---|---|---|---:|---|
| `access-token-scope-expansion` | **not-ready** | `449d7f9a570517fe168dc12a24da0d6d` | 8 | `allowed-assumptions-visible` |
| `caa-revalidation` | **not-ready** | `cbb41af034435cec75810117377febcb` | 8 | `allowed-assumptions-visible` |
| `checker-required-memory-poisoning` | **human-ready** | `0530fe3b520faaddd9ad7ed8742825cc` | 8 | none |
| `dao-descendant` | **not-ready** | `bbb02380b6f8633fec7bc0e9d2956ec1` | 8 | `hidden-sampling-visible`, `allowed-assumptions-visible`, `forbidden-assumptions-visible`, `solvable-without-source-internals` |
| `delegated-wallet-scope-reconciliation` | **human-ready** | `0a9b26f37d40e87f67a5f755d79a0a85` | 9 | none |
| `deployment-model-alias-rollout-drift` | **human-ready** | `5b3171584b8a190743067d745b22e586` | 9 | none |
| `deployment-rollback-recompute` | **not-ready** | `46ed5ea45b412e242ef362fde040051a` | 8 | `hidden-sampling-visible`, `allowed-assumptions-visible`, `forbidden-assumptions-visible`, `solvable-without-source-internals` |
| `durable-approval-outbox` | **not-ready** | none | 0 | `public-package-present`, `surface-complete`, `spec-rules-complete`, `hidden-sampling-visible`, `allowed-assumptions-visible`, `forbidden-assumptions-visible`, `examples-present`, `scoring-contract-visible`, `hidden-artifacts-absent`, `solvable-without-source-internals` |
| `prompt-injection-containment` | **human-ready** | `bbc682395fdc508b829d19e908def046` | 8 | none |
| `prompt-injection-memory-poisoning` | **human-ready** | `14870e7a6999848e888db374fede18b3` | 9 | none |
| `trading-reconciliation-recompute` | **not-ready** | `61183c46b73606ef156ea9121d3b0308` | 8 | `hidden-sampling-visible`, `allowed-assumptions-visible`, `forbidden-assumptions-visible`, `solvable-without-source-internals` |
| `ui-action-record-replay` | **human-ready** | `9b00f533f3fd08718ddb96394f92fa48` | 8 | none |
| `ui-replay-live-dom` | **human-ready** | `b79ba7c2d564aa9b83775bfe064c2f78` | 9 | none |

## Current Reading

Human-ready families: `checker-required-memory-poisoning`, `delegated-wallet-scope-reconciliation`, `deployment-model-alias-rollout-drift`, `prompt-injection-containment`, `prompt-injection-memory-poisoning`, `ui-action-record-replay`, `ui-replay-live-dom`.
Blocked or unavailable packages: `access-token-scope-expansion`, `caa-revalidation`, `dao-descendant`, `deployment-rollback-recompute`, `durable-approval-outbox`, `trading-reconciliation-recompute`.

A ready verdict says the public package is complete enough for a clean-room human attempt. It does
not say that a human has solved it.

## Audit Checks

### `access-token-scope-expansion`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to 449d7f9a570517fe168dc12a24da0d6d |
| `surface-complete` | pass | 8 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 8 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | pass | hidden coverage is described as sampling the public declared space |
| `allowed-assumptions-visible` | **FAIL** | allowed assumptions are not stated explicitly enough |
| `forbidden-assumptions-visible` | pass | must-not/fails/illegal language is visible |
| `examples-present` | pass | 3 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | pass | public package contains the contract needed for a clean-room attempt |

### `caa-revalidation`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to cbb41af034435cec75810117377febcb |
| `surface-complete` | pass | 8 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 5 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | pass | hidden coverage is described as sampling the public declared space |
| `allowed-assumptions-visible` | **FAIL** | allowed assumptions are not stated explicitly enough |
| `forbidden-assumptions-visible` | pass | must-not/fails/illegal language is visible |
| `examples-present` | pass | 3 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | pass | public package contains the contract needed for a clean-room attempt |

### `checker-required-memory-poisoning`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to 0530fe3b520faaddd9ad7ed8742825cc |
| `surface-complete` | pass | 8 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 14 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | pass | hidden coverage is described as sampling the public declared space |
| `allowed-assumptions-visible` | pass | declared-space or nothing-outside language is visible |
| `forbidden-assumptions-visible` | pass | must-not/fails/illegal language is visible |
| `examples-present` | pass | 2 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | pass | public package contains the contract needed for a clean-room attempt |

### `dao-descendant`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to bbb02380b6f8633fec7bc0e9d2956ec1 |
| `surface-complete` | pass | 8 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 5 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | **FAIL** | public package does not clearly say hidden cases add no rules |
| `allowed-assumptions-visible` | **FAIL** | allowed assumptions are not stated explicitly enough |
| `forbidden-assumptions-visible` | **FAIL** | forbidden assumptions are not stated explicitly enough |
| `examples-present` | pass | 3 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | **FAIL** | a solver would need hidden source or author context |

### `delegated-wallet-scope-reconciliation`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to 0a9b26f37d40e87f67a5f755d79a0a85 |
| `surface-complete` | pass | 9 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 10 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | pass | hidden coverage is described as sampling the public declared space |
| `allowed-assumptions-visible` | pass | declared-space or nothing-outside language is visible |
| `forbidden-assumptions-visible` | pass | must-not/fails/illegal language is visible |
| `examples-present` | pass | 4 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | pass | public package contains the contract needed for a clean-room attempt |

### `deployment-model-alias-rollout-drift`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to 5b3171584b8a190743067d745b22e586 |
| `surface-complete` | pass | 9 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 10 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | pass | hidden coverage is described as sampling the public declared space |
| `allowed-assumptions-visible` | pass | declared-space or nothing-outside language is visible |
| `forbidden-assumptions-visible` | pass | must-not/fails/illegal language is visible |
| `examples-present` | pass | 4 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | pass | public package contains the contract needed for a clean-room attempt |

### `deployment-rollback-recompute`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to 46ed5ea45b412e242ef362fde040051a |
| `surface-complete` | pass | 8 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 5 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | **FAIL** | public package does not clearly say hidden cases add no rules |
| `allowed-assumptions-visible` | **FAIL** | allowed assumptions are not stated explicitly enough |
| `forbidden-assumptions-visible` | **FAIL** | forbidden assumptions are not stated explicitly enough |
| `examples-present` | pass | 3 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | **FAIL** | a solver would need hidden source or author context |

### `durable-approval-outbox`

| check | result | detail |
|---|---|---|
| `public-package-present` | **FAIL** | no generated challenge package is checked by this repository for this imported or unbuilt family |
| `surface-complete` | **FAIL** | README.md, SPEC.md, types/API and manifest are not available here |
| `spec-rules-complete` | **FAIL** | no visible SPEC.md was audited in this repository |
| `hidden-sampling-visible` | **FAIL** | hidden coverage cannot be audited without a public package |
| `allowed-assumptions-visible` | **FAIL** | allowed assumptions cannot be audited without a public package |
| `forbidden-assumptions-visible` | **FAIL** | forbidden assumptions cannot be audited without a public package |
| `examples-present` | **FAIL** | no visible examples are available here |
| `scoring-contract-visible` | **FAIL** | no public scoring contract is available here |
| `hidden-artifacts-absent` | **FAIL** | no generated package split was checked here |
| `solvable-without-source-internals` | **FAIL** | a human would need source or external context |

### `prompt-injection-containment`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to bbc682395fdc508b829d19e908def046 |
| `surface-complete` | pass | 8 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 8 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | pass | hidden coverage is described as sampling the public declared space |
| `allowed-assumptions-visible` | pass | declared-space or nothing-outside language is visible |
| `forbidden-assumptions-visible` | pass | must-not/fails/illegal language is visible |
| `examples-present` | pass | 3 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | pass | public package contains the contract needed for a clean-room attempt |

### `prompt-injection-memory-poisoning`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to 14870e7a6999848e888db374fede18b3 |
| `surface-complete` | pass | 9 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 8 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | pass | hidden coverage is described as sampling the public declared space |
| `allowed-assumptions-visible` | pass | declared-space or nothing-outside language is visible |
| `forbidden-assumptions-visible` | pass | must-not/fails/illegal language is visible |
| `examples-present` | pass | 4 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | pass | public package contains the contract needed for a clean-room attempt |

### `trading-reconciliation-recompute`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to 61183c46b73606ef156ea9121d3b0308 |
| `surface-complete` | pass | 8 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 5 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | **FAIL** | public package does not clearly say hidden cases add no rules |
| `allowed-assumptions-visible` | **FAIL** | allowed assumptions are not stated explicitly enough |
| `forbidden-assumptions-visible` | **FAIL** | forbidden assumptions are not stated explicitly enough |
| `examples-present` | pass | 3 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | **FAIL** | a solver would need hidden source or author context |

### `ui-action-record-replay`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to 9b00f533f3fd08718ddb96394f92fa48 |
| `surface-complete` | pass | 8 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 7 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | pass | hidden coverage is described as sampling the public declared space |
| `allowed-assumptions-visible` | pass | declared-space or nothing-outside language is visible |
| `forbidden-assumptions-visible` | pass | must-not/fails/illegal language is visible |
| `examples-present` | pass | 3 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | pass | public package contains the contract needed for a clean-room attempt |

### `ui-replay-live-dom`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to b79ba7c2d564aa9b83775bfe064c2f78 |
| `surface-complete` | pass | 9 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 13 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | pass | hidden coverage is described as sampling the public declared space |
| `allowed-assumptions-visible` | pass | declared-space or nothing-outside language is visible |
| `forbidden-assumptions-visible` | pass | must-not/fails/illegal language is visible |
| `examples-present` | pass | 4 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | pass | public package contains the contract needed for a clean-room attempt |

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
