# Human readiness

Human-readiness asks whether the public package can be handed to an independent engineer without
hidden source, author memory or private hints. It is separate from reference solvability and from
model difficulty.

| family | human-readiness | package hash | visible files | blockers |
|---|---|---|---:|---|
| `access-token-scope-expansion` | **not-ready** | `8ae0950dea093d35d98b12d1c8c1bde5` | 8 | `allowed-assumptions-visible` |
| `checker-required-memory-poisoning` | **human-ready** | `448f2f816c51030cc97a374816226168` | 8 | none |
| `delegated-wallet-scope-reconciliation` | **human-ready** | `45f27b644a84364e3d3855f68cd243a2` | 9 | none |
| `deployment-model-alias-rollout-drift` | **human-ready** | `805efb58c923f9e081db1b41967392d7` | 9 | none |
| `durable-approval-outbox` | **not-ready** | none | 0 | `public-package-present`, `surface-complete`, `spec-rules-complete`, `hidden-sampling-visible`, `allowed-assumptions-visible`, `forbidden-assumptions-visible`, `examples-present`, `scoring-contract-visible`, `hidden-artifacts-absent`, `solvable-without-source-internals` |
| `prompt-injection-containment` | **human-ready** | `4911ffdfbd2c0e9b51752ed16c4f53e8` | 8 | none |
| `prompt-injection-memory-poisoning` | **human-ready** | `7443bf6d6c6b2ccf69cc20f417ff048c` | 8 | none |
| `ui-action-record-replay` | **human-ready** | `1050e79f4804a96a5327d50dd81765b0` | 8 | none |
| `ui-replay-live-dom` | **human-ready** | `18c3f5afc5973604205cd7df23ce4cad` | 9 | none |

## Current Reading

Human-ready families: `checker-required-memory-poisoning`, `delegated-wallet-scope-reconciliation`, `deployment-model-alias-rollout-drift`, `prompt-injection-containment`, `prompt-injection-memory-poisoning`, `ui-action-record-replay`, `ui-replay-live-dom`.
Blocked or unavailable packages: `access-token-scope-expansion`, `durable-approval-outbox`.

A ready verdict says the public package is complete enough for a clean-room human attempt. It does
not say that a human has solved it.

## Audit Checks

### `access-token-scope-expansion`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to 8ae0950dea093d35d98b12d1c8c1bde5 |
| `surface-complete` | pass | 8 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 8 visible rule code(s) in SPEC.md |
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
| `public-package-present` | pass | checked-in public package hashes to 448f2f816c51030cc97a374816226168 |
| `surface-complete` | pass | 8 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 14 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | pass | hidden coverage is described as sampling the public declared space |
| `allowed-assumptions-visible` | pass | declared-space or nothing-outside language is visible |
| `forbidden-assumptions-visible` | pass | must-not/fails/illegal language is visible |
| `examples-present` | pass | 2 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | pass | public package contains the contract needed for a clean-room attempt |

### `delegated-wallet-scope-reconciliation`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to 45f27b644a84364e3d3855f68cd243a2 |
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
| `public-package-present` | pass | checked-in public package hashes to 805efb58c923f9e081db1b41967392d7 |
| `surface-complete` | pass | 9 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 10 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | pass | hidden coverage is described as sampling the public declared space |
| `allowed-assumptions-visible` | pass | declared-space or nothing-outside language is visible |
| `forbidden-assumptions-visible` | pass | must-not/fails/illegal language is visible |
| `examples-present` | pass | 4 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | pass | public package contains the contract needed for a clean-room attempt |

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
| `public-package-present` | pass | checked-in public package hashes to 4911ffdfbd2c0e9b51752ed16c4f53e8 |
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
| `public-package-present` | pass | checked-in public package hashes to 7443bf6d6c6b2ccf69cc20f417ff048c |
| `surface-complete` | pass | 8 visible file(s), including README, SPEC, API and starter |
| `spec-rules-complete` | pass | 8 visible rule code(s) in SPEC.md |
| `hidden-sampling-visible` | pass | hidden coverage is described as sampling the public declared space |
| `allowed-assumptions-visible` | pass | declared-space or nothing-outside language is visible |
| `forbidden-assumptions-visible` | pass | must-not/fails/illegal language is visible |
| `examples-present` | pass | 3 visible example file(s) |
| `scoring-contract-visible` | pass | public README/SPEC states how grading works |
| `hidden-artifacts-absent` | pass | challenge package passed the independent leak checker |
| `solvable-without-source-internals` | pass | public package contains the contract needed for a clean-room attempt |

### `ui-action-record-replay`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in public package hashes to 1050e79f4804a96a5327d50dd81765b0 |
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
| `public-package-present` | pass | checked-in public package hashes to 18c3f5afc5973604205cd7df23ce4cad |
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
