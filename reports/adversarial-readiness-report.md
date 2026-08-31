# Adversarial verifier-integrity readiness

Adversarial readiness asks whether the verifier can be attacked under a declared threat model.
It is separate from package leak checks, mutant detection, model difficulty and human solvability.

Cheat resistance is not the same claim as no bypass found. Cheat resistance is the design requirement; adversarial audit is the attempted exploit record.

| family | readiness | package hash | campaign | bundle | blockers |
|---|---|---|---|---|---|
| `checker-required-memory-poisoning` | **adversarial-ready** | `448f2f816c51030cc97a374816226168` | `checker-required-memory-poisoning-adversarial` | `bundles/checker-required-memory-poisoning-adversarial` | none |
| `durable-approval-outbox` | **audit-pending** | none | none | none | `public-package-present`, `package-leak-check`, `campaign-file-present`, `threat-model-declared`, `access-boundary-declared`, `outcome-contract-declared`, `never-counts-declared` |
| `prompt-injection-containment` | **adversarial-ready** | `4911ffdfbd2c0e9b51752ed16c4f53e8` | `prompt-injection-containment-adversarial` | `bundles/prompt-injection-containment-adversarial` | none |
| `prompt-injection-memory-poisoning` | **adversarial-ready** | `9b3e0c84addabc2e195ecbd490ba81dd` | `prompt-injection-memory-poisoning-adversarial` | `bundles/prompt-injection-memory-poisoning-adversarial` | none |
| `ui-action-record-replay` | **adversarial-ready** | `1050e79f4804a96a5327d50dd81765b0` | `ui-action-record-replay-adversarial` | `bundles/ui-action-record-replay-adversarial` | none |
| `ui-replay-live-dom` | **adversarial-ready** | `18c3f5afc5973604205cd7df23ce4cad` | `ui-replay-live-dom-adversarial` | `bundles/ui-replay-live-dom-adversarial` | none |

## Current Reading

Adversarial-ready families: `checker-required-memory-poisoning`, `prompt-injection-containment`, `prompt-injection-memory-poisoning`, `ui-action-record-replay`, `ui-replay-live-dom`.
Audit-pending families: `durable-approval-outbox`.

A ready verdict means the attack campaign is prepared and hash-pinned. It does not mean anyone
has tried to exploit the verifier, and it does not mean no bypass exists.

## Audit Checks

### `checker-required-memory-poisoning`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in challenge package hashes to 448f2f816c51030cc97a374816226168 |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign checker-required-memory-poisoning-adversarial |
| `campaign-hash-current` | pass | campaign pins current hash 448f2f816c51030cc97a374816226168 |
| `threat-model-declared` | pass | 11 attack surface(s) |
| `access-boundary-declared` | pass | allowed and forbidden attacker access are both declared |
| `outcome-contract-declared` | pass | bypass and no-bypass outcomes are declared separately |
| `never-counts-declared` | pass | refusal, infrastructure errors and stale hashes never count |
| `attack-bundle-present` | pass | bundle ./bundles/checker-required-memory-poisoning-adversarial |
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
| `public-package-present` | pass | checked-in challenge package hashes to 4911ffdfbd2c0e9b51752ed16c4f53e8 |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign prompt-injection-containment-adversarial |
| `campaign-hash-current` | pass | campaign pins current hash 4911ffdfbd2c0e9b51752ed16c4f53e8 |
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
| `public-package-present` | pass | checked-in challenge package hashes to 9b3e0c84addabc2e195ecbd490ba81dd |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign prompt-injection-memory-poisoning-adversarial |
| `campaign-hash-current` | pass | campaign pins current hash 9b3e0c84addabc2e195ecbd490ba81dd |
| `threat-model-declared` | pass | 11 attack surface(s) |
| `access-boundary-declared` | pass | allowed and forbidden attacker access are both declared |
| `outcome-contract-declared` | pass | bypass and no-bypass outcomes are declared separately |
| `never-counts-declared` | pass | refusal, infrastructure errors and stale hashes never count |
| `attack-bundle-present` | pass | bundle ./bundles/prompt-injection-memory-poisoning-adversarial |
| `fs-sandbox-isolation-check` | pass | bundle declares fs-sandbox and leaks no hidden files |
| `exploit-schema-present` | pass | exploit artifact schema is included in the attack packet |

### `ui-action-record-replay`

| check | result | detail |
|---|---|---|
| `public-package-present` | pass | checked-in challenge package hashes to 1050e79f4804a96a5327d50dd81765b0 |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign ui-action-record-replay-adversarial |
| `campaign-hash-current` | pass | campaign pins current hash 1050e79f4804a96a5327d50dd81765b0 |
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
| `public-package-present` | pass | checked-in challenge package hashes to 18c3f5afc5973604205cd7df23ce4cad |
| `package-leak-check` | pass | public challenge package passes leak check |
| `campaign-file-present` | pass | campaign ui-replay-live-dom-adversarial |
| `campaign-hash-current` | pass | campaign pins current hash 18c3f5afc5973604205cd7df23ce4cad |
| `threat-model-declared` | pass | 12 attack surface(s) |
| `access-boundary-declared` | pass | allowed and forbidden attacker access are both declared |
| `outcome-contract-declared` | pass | bypass and no-bypass outcomes are declared separately |
| `never-counts-declared` | pass | refusal, infrastructure errors and stale hashes never count |
| `attack-bundle-present` | pass | bundle ./bundles/ui-replay-live-dom-adversarial |
| `fs-sandbox-isolation-check` | pass | bundle declares fs-sandbox and leaks no hidden files |
| `exploit-schema-present` | pass | exploit artifact schema is included in the attack packet |

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
