# DAO recompute descendant: packaged calibration task

This report is generated from the runnable family, package checker and B6-gated sweep. Phase 9
is provenance for the recipe; the numbers below are recomputed from this package.

| property | measured value |
|---|---:|
| challenge files | 8 |
| challenge hash | `9d89b49307a960f65f2e6e8f204fd15e` |
| declared scenario space | 72 |
| selected scenarios | 24 |
| activated target stratum | 18 |
| non-activation controls | 6 |
| reference failures | 0 |
| narrow recompute failures in target stratum | 18/18 |
| narrow mutant locally green in target stratum | 18/18 |
| narrow mutant failures in non-activation controls | 0/6 |
| intended mutants caught | 3/3 |
| B6 controls usable | yes |
| malformed input refused | yes |
| challenge leak/manifest gate | pass |

## Isolation claim

The package contains no ACKED or REVOKED state. The narrow mutant differs from the reference
only by recovering the committed idempotency key versus deriving it from the current lease
epoch. Its own tool confirmations remain green while the sealed per-action ledger diverges.

## Evidence boundary

This is deterministic local verifier and packaging evidence. It is not frontier-agent
difficulty evidence, and the measured 0.18 build hours remain descendant-only.

## Durable trial capture contract

The descendant is registered in the family-aware trial router. Native runs use the shared
orchestrator and `writeTrialDirectory`, preserving the content-hashed challenge, submission,
full event trajectory, agent workspace files, verifier output, metadata, normalized result and
countability decision. A summary row without that directory remains uncountable. No paid run or
trial directory was created in this phase.
