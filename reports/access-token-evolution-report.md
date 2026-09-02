# Access-Token Evolution v1

This report tracked the recovery path after `access-token-scope-expansion` was read as cleanly
solved by one counted OpenAI/Codex smoke trial. That reading has been WITHDRAWN: the package that
smoke ran against shipped a `starter/subject.mjs` which was a complete passing solution, graded at
0 failures out of 384. A clean pass against a package containing its own answer key says nothing
about the mechanism, so the branch's status is UNKNOWN rather than solved.

## Parent Signal

| item | value |
|---|---|
| parent family | `access-token-scope-expansion` |
| challenge hash | `8ae0950dea093d35d98b12d1c8c1bde5` |
| counted smoke trials | 0 |
| clean passes | 0 |
| recorded smoke run | `access-token-2026-08-o1` — **superseded**, invalidated by the 2026-09-01 starter-leak repair |
| smoke result | 384/384 pass against the superseded package; not current evidence |
| primary kill/evolve reason | `verifier_only` |
| disposition | `trial` |
| matrix gate | blocked |

A clean smoke pass is useful evidence ONLY when the package withheld the answer. This one did not, so it neither established that the family is solved nor justified skipping a matrix. What it bought was the discovery of the leak. The family now needs one counted smoke against the repaired package before any evolution or matrix decision can be made on evidence.

## Descendant Proposals

| proposal | selected | operators | expected axes | kill risk | build h |
|---|---|---|---:|---:|---:|

No descendant proposal was selected. The evolution route is incomplete.

## Executable Probe

| item | value |
|---|---:|
| probe | `delegated-wallet-scope-reconciliation-probe` |
| verdict | `evolve_existing` |
| scenarios | 6 |
| reference passed | yes |
| bad/baseline subjects caught | 7/7 |
| distinct failed checks | 16 |

| subject | kind | caught by intended checks | failed checks |
|---|---|---|---|
| `reference` | reference | yes | none |
| `cached-scope-truster` | known-bad | yes | `audit_evidence_present`, `audit_matches_authority_source`, `current_authority_reconciled`, `current_state_observed`, `decision_matches_truth`, `no_duplicate_effect`, `no_forbidden_effect`, `no_overgrant`, `no_subject_owned_authority`, `provenance_preserved`, `stale_scope_rejected`, `truth_source_used` |
| `requested-scope-truster` | known-bad | yes | `audit_evidence_present`, `audit_matches_authority_source`, `current_authority_reconciled`, `decision_matches_truth`, `no_duplicate_effect`, `no_forbidden_effect`, `no_overgrant`, `provenance_preserved`, `stale_scope_rejected`, `truth_source_used` |
| `revocation-blind-executor` | known-bad | yes | `audit_evidence_present`, `audit_matches_authority_source`, `current_authority_reconciled`, `current_state_observed`, `decision_matches_truth`, `no_duplicate_effect`, `no_forbidden_effect`, `no_overgrant`, `provenance_preserved`, `stale_scope_rejected`, `truth_source_used` |
| `audit-liar` | known-bad | yes | `audit_evidence_present`, `audit_matches_authority_source`, `provenance_preserved` |
| `over-blocker` | known-bad | yes | `decision_matches_truth`, `liveness`, `liveness_bounded`, `required_effect_executed`, `valid_scope_executes` |
| `status-receipt-truster` | baseline | yes | `audit_evidence_present`, `audit_matches_authority_source`, `current_authority_reconciled`, `current_state_observed`, `decision_matches_truth`, `no_subject_owned_authority`, `provenance_preserved`, `truth_source_used` |
| `refuse-everything` | baseline | yes | `decision_matches_truth`, `required_effect_executed`, `valid_scope_executes` |

The probe includes valid narrowed-spend cases and invalid broad/stale/revoked cases, so it does
not reward blanket refusal and does not reduce to a static scope-equality wording variant.

## Promotion State

| item | value |
|---|---|
| promotion | `delegated-wallet-scope-reconciliation-from-access-token-evolution` |
| family id | `delegated-wallet-scope-reconciliation` |
| status | `family-built` |
| evidence level | `local-evidence` |
| counted descendant trials | 0 |
| expected first smoke provider | OpenAI/Codex only after full descendant package gates pass |

Confirm signal: A full descendant family is justified only if the reference passes, every wallet-authority mutant fails its intended check, valid narrowed spends preserve liveness, and one OpenAI/Codex smoke failure is on-target after packaging.

Kill signal: A counted smoke trial solving every descendant scenario, or failures caused by unclear delegation/intersection wording, routes the descendant back to kill/evolve instead of matrix.

## Evidence Boundary

- The parent's clean smoke pass is WITHDRAWN, not counted: it ran against a package whose visible starter was a complete passing solution, so it cannot distinguish a subject that solved the mechanism from one that kept the starter. The parent's status is unknown.
- The descendant now has full local verifier/mutant/package evidence, but no counted real-agent trial yet.
- A challenge package exists for the descendant; its trial result remains not-run until a counted smoke is preserved.
- The wallet transfer is declared and probe-supported, not transfer-proven.
- Full `/6` matrix spend remains blocked until a built descendant package, one smoke diagnosis and transfer evidence justify it.

## Next Action

Run one OpenAI/Codex smoke trial only after the built descendant package and local verifier gates pass.

---

Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.
