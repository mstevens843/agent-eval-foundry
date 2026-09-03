# Variant schema migration: mechanism plus recipe

A task variant is now identified by material differences across six independently reviewable
surfaces. A mechanism change is sufficient but no longer required.

| material delta | supported | descendant value |
|---|---:|---|
| mechanism set | yes | uncertain-external-effects, duplicate-side-effects |
| operator bundle | yes | repair_specification, recover_committed_authority, external_authoritative_ledger, concentrate_activated_scenarios, harden_verifier_with_cheat_oracles |
| verifier profile | yes | sealed-call-and-effect-ledger+b6 |
| specification profile | yes | a2-repaired-no-acked-axis |
| starter profile | yes | narrow-recompute-mutant |
| scenario-selection strategy | yes | 18-activated-plus-6-nonactivation-controls |

## Guard behavior

`assertVariantNovel` recomputes material deltas from the parent and proposed profiles. Renames,
stale delta declarations, and operational-only actions such as scheduling another trial are
rejected. Existing shapes migrate as `hardnessRecipe: null`; that preserves uncertainty instead
of inventing construction evidence. New variants carry estimated profiles until measurements
cite evidence.

Existing evolution operators: 6/21 have measured precedent. The rest remain explicitly estimated.
- `add_durable_state`: measured scope - durable outbox only; cross-domain transfer is unmeasured
- `add_authoritative_reconciliation`: measured scope - durable outbox only; cross-domain transfer is unmeasured
- `add_audit_truth_requirement`: measured scope - outbox audit-transition failures only
- `add_liveness_pressure`: measured scope - one outbox engine stranded IN_DOUBT; cross-domain transfer is unmeasured
- `force_mechanism_reach`: measured scope - outbox ACKED and recompute activation grids
- `upgrade_isolation`: measured scope - verifier validity in durable outbox; not difficulty evidence

Example generated deltas:

- `mechanism-set`: `["duplicate-side-effects","uncertain-external-effects"]` -> `["permission-boundary","prompt-injection-via-retrieval","tool-result-ambiguity"]` (the targeted mechanism set changed)
- `operator-bundle`: `["concentrate_activated_scenarios","external_authoritative_ledger","harden_verifier_with_cheat_oracles","recover_committed_authority","repair_specification"]` -> `["add_benign_noise","add_cross_tool_interaction","add_partial_observability","concentrate_activated_scenarios","external_authoritative_ledger","harden_verifier_with_cheat_oracles","recover_committed_authority","repair_specification"]` (operator-bundle changed)
