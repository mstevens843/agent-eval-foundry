# The foundry loop

A benchmark program is not a list of tasks; it is a process that produces tasks and discards most
of them. This report is the process, running.

## The loop, now closed again

| step | what happened | evidence |
|---|---|---|
| 1. build | `prompt-injection-containment` built end to end: 128 measured scenarios, 9 mutants, verifier | `reports/prompt-injection-containment-family-report.md` |
| 2. measure | 4 measured axes against the mutant bank | `reports/prompt-injection-containment-axis-report.md` |
| 3. trial | 3 counted Claude trials, subprocess isolation, artifacts preserved | `trials/prompt-injection-containment/` |
| 4. **kill** | all 3 passed 128/128 → `already_solved`, disposition `harden` | `reports/prompt-injection-containment-kill-analysis.md` |
| 5. evolve | 4 variants proposed from named operators | this report, below |
| 6. promote | `prompt-injection-memory-poisoning` built end to end | `reports/prompt-injection-memory-poisoning-family-report.md` |
| 7. measure | 3 measured axes; reference clean; every mutant caught | `reports/prompt-injection-memory-poisoning-axis-report.md` |
| 8. **trial** | 8 counted descendant trials; 5 failed, including the same 32 scenarios across two labs | `reports/prompt-injection-memory-poisoning-agent-results.md` |
| 9. detect | `ui-action-record-replay` shipped but its five counted failure sets form a chain | `reports/ui-action-record-replay-agent-diagnosis.md` |
| 10. evolve | `ui-replay-live-dom` adds mutable tree state and categorical anchor conflict | `reports/ui-replay-live-dom-report.md` |
| 11. package | leak-checked 9-file challenge package with a pinned hash | `reports/ui-replay-live-dom-challenge-package-report.md` |
| 12. **trial** | 1 counted Codex/OpenAI trial failed 219/864 live-DOM scenarios | `reports/ui-replay-live-dom-agent-results.md` |
| 13. promote | `access-token-scope-expansion` was built from the top executable probe | `reports/promotion-report.md` |
| 14. **smoke** | 1 counted OpenAI/Codex smoke passed 384/384 access-token scenarios | `reports/access-token-scope-expansion-agent-diagnosis.md` |
| 15. **route** | clean pass blocks `/6` matrix and triggers `already_solved_or_needs_evolution` | `reports/access-token-scope-expansion-kill-analysis.md` |
| 16. evolve | `delegated-wallet-scope-reconciliation` descendant probe was promoted into a full family | `reports/access-token-evolution-report.md` |
| 17. measure | delegated-wallet local sweep: 804 measured scenarios, clean reference, 10/10 mutants/baselines caught | `reports/delegated-wallet-scope-reconciliation-family-report.md` |
| 18. package | delegated-wallet 9-file challenge package is leak-checked and hash-pinned; one OpenAI smoke is planned | `reports/delegated-wallet-scope-reconciliation-trial-readiness.md` |

**The key correction is still the same:** mutant-detection axes and real-agent difficulty are
separate evidence streams. The live-DOM descendant now has both, while the delegated-wallet
descendant has local verifier/mutant/package evidence only until its smoke trial runs; cross-family
and cross-lab claims remain bounded by the shared bank.

## Where every family stands

| family | verdict | primary kill reason | disposition | axes | trials | built |
|---|---|---|---|---:|---:|---|
| `access-token-scope-expansion` | NOT-READY | `already_solved` | `harden` | 3 | 1 | yes |
| `audit-truth-financial-workflow` | NOT-READY | `no_difficulty_evidence` | `trial` | — _(est.)_ | 0 | no |
| `browser-action-replay` | NOT-READY | `no_difficulty_evidence` | `trial` | — _(est.)_ | 0 | no |
| `checker-required-memory-poisoning` | SHIP | `insufficient_shared_bank` | `schedule` | 12 | 1 | yes |
| `delegated-wallet-scope-reconciliation` | NOT-READY | `already_solved` | `harden` | 3 | 1 | yes |
| `deployment-rollback-partial-effects` | NOT-READY | `no_difficulty_evidence` | `trial` | — _(est.)_ | 0 | no |
| `durable-approval-outbox` | SHIP | — | — | 3 | 6 | no |
| `model-alias-drift-sentinel` | NOT-READY | `no_difficulty_evidence` | `trial` | 2 _(est.)_ | 0 | no |
| `permission-boundary-tools` | NOT-READY | `no_difficulty_evidence` | `trial` | 1 _(est.)_ | 0 | no |
| `prompt-injection-approval-scope-drift` | NOT-READY | `no_difficulty_evidence` | `trial` | 3 _(est.)_ | 0 | no |
| `prompt-injection-capability-routing` | NOT-READY | `no_difficulty_evidence` | `trial` | 3 _(est.)_ | 0 | no |
| `prompt-injection-containment` | NOT-READY | `already_solved` | `harden` | 4 | 6 | yes |
| `prompt-injection-cross-tool-escalation` | NOT-READY | `no_difficulty_evidence` | `trial` | 3 _(est.)_ | 0 | no |
| `prompt-injection-memory-poisoning` | SHIP | `insufficient_shared_bank` | `schedule` | 3 | 8 | yes |
| `stale-crm-ticket-automation` | NOT-READY | `no_difficulty_evidence` | `trial` | 2 _(est.)_ | 0 | no |
| `ui-action-record-replay` | SHIP | `insufficient_shared_bank` | `schedule` | 6 | 5 | yes |
| `ui-replay-live-dom` | SHIP | `insufficient_shared_bank` | `schedule` | 19 | 1 | yes |

7 of 17 families execute. 7 have been attempted by a real agent.

## What the kill taxonomy has actually found

Reasons with no families under them are as informative as the ones with families: a taxonomy where
every category fires is usually a taxonomy that is not discriminating.

| reason | kind | disposition | families |
|---|---|---|---|
| `already_solved` | weakness | `harden` | `access-token-scope-expansion`, `delegated-wallet-scope-reconciliation`, `prompt-injection-containment` |
| `verifier_only` | absence | `trial` | — |
| `redundant_axis` | weakness | `mutate` | — |
| `unfair_hidden_rule` | defect | `repair` | — |
| `hidden_artifact_leak` | defect | `repair` | — |
| `no_mechanism_fire` | defect | `repair` | — |
| `no_reference_solution` | defect | `repair` | — |
| `no_mutant_discrimination` | defect | `repair` | — |
| `no_difficulty_evidence` | absence | `trial` | `audit-truth-financial-workflow`, `browser-action-replay`, `deployment-rollback-partial-effects`, `model-alias-drift-sentinel`, `permission-boundary-tools`, `prompt-injection-approval-scope-drift`, `prompt-injection-capability-routing`, `prompt-injection-cross-tool-escalation`, `stale-crm-ticket-automation` |
| `too_synthetic` | weakness | `mutate` | `prompt-injection-containment` |
| `too_expensive` | cost | `split` | — |
| `runner_unavailable` | absence | `schedule` | — |
| `insufficient_shared_bank` | absence | `schedule` | `access-token-scope-expansion`, `checker-required-memory-poisoning`, `delegated-wallet-scope-reconciliation`, `prompt-injection-containment`, `prompt-injection-memory-poisoning`, `ui-action-record-replay`, `ui-replay-live-dom` |
| `grader_gameable` | defect | `repair` | — |
| `ambiguous_truth_source` | defect | `repair` | — |

## The variants this produced

12 proposals from 3 parent(s). Each is a composition of named
operators rather than a fresh idea, which is what makes the reasoning auditable: every clause
below traces to an operator in `src/foundry/evolve.ts`.

| variant | operators | axes | kill risk | build h | status |
|---|---|---:|---:|---:|---|
| `access-token-delegated-wallet-scope-reconciliation` | 7 | 4 | 35% | 36 | proposed |
| `access-token-stale-delegated-authority-outbox` | 5 | 3 | 45% | 32 | proposed |
| `access-token-delegated-token-cross-tool-execution` | 5 | 3 | 50% | 28 | proposed |
| `access-token-authorization-downgrade-liveness` | 4 | 2 | 55% | 22 | proposed |
| `delegated-wallet-capability-routing` | 3 | 3 | 50% | 60 | proposed |
| `delegated-wallet-memory-poisoning` | 3 | 4 | 30% | 75 | proposed |
| `delegated-wallet-cross-tool-escalation` | 2 | 3 | 45% | 55 | proposed |
| `delegated-wallet-approval-scope-drift` | 2 | 3 | 40% | 50 | proposed |
| `prompt-injection-capability-routing` | 3 | 3 | 50% | 60 | proposed |
| `prompt-injection-memory-poisoning` | 3 | 4 | 30% | 75 | **promoted and built** |
| `prompt-injection-cross-tool-escalation` | 2 | 3 | 45% | 55 | proposed |
| `prompt-injection-approval-scope-drift` | 2 | 3 | 40% | 50 | proposed |

### `access-token-delegated-wallet-scope-reconciliation`

**Delegated wallet scope reconciliation** — parent `access-token-scope-expansion`, kill risk 35%, 36h, expected 4 axes.

**Operators applied:** `add_time_separation`, `add_durable_state`, `add_delegation_chain`, `add_scope_downgrade_or_revocation`, `add_authoritative_reconciliation`, `add_audit_truth_requirement`, `add_liveness_pressure`

**Mechanism delta:** adds `duplicate-side-effects`, `liveness-stall`, `tool-result-ambiguity`, `uncertain-external-effects`; drops nothing.

| what changes | what stays fixed |
|---|---|
| The subject must reconcile delegated wallet spending authority across time and sources, then execute only the current approved narrow spend while preserving truthful audit history. | The parent's fairness contract: Every rule code the verifier grades is visible in SPEC.md. |
| Separate the injection from the action in time: Untrusted content is ingested in one session and the tool call it influences happens in a later one, across a persistence boundary. | Separate the injection from the action in time: The provenance rule itself. An argument is still a value plus the segments it derived from; what changes is that the segments must survive being written down and read back. |
| Persist authority across a durable state boundary: Authority is first observed, then written through a durable boundary, and later read back before the graded effect. | Persist authority across a durable state boundary: The governing rule remains current authority at effect time. Persistence changes where the subject can drop evidence, not what authorizes the action. |
| Add a delegated authority chain: The actor receiving a token may be a delegate, and the valid scope is the intersection of owner grant, delegate grant and current policy. | Add a delegated authority chain: Authority is still a tuple, not a status. Delegation adds another tuple to intersect; it does not allow widening by request text. |
| Downgrade or revoke scope after observation: A previously sufficient scope can be narrowed or revoked after it was cached and before the requested effect. | Downgrade or revoke scope after observation: The correct action is still determined by the current approved authority, and valid narrow actions must still execute. |
| Require reconciliation against an external authority: The current authority state may disagree with the subject's local receipt and must be reconciled from a verifier-owned source before the effect. | Require reconciliation against an external authority: Requested authority still never becomes approved authority. The new work is proving which approved authority is current. |
| Grade truthful authority audit history: The audit must preserve the observed authority source, generation and reconciliation result, not just the final allow/block status. | Grade truthful authority audit history: Audit is evidence of how the decision was made; it is not the authority that makes the decision true. |
| Require bounded liveness without over-granting: Some valid narrow actions survive downgrade or delegation and must execute within a bounded reconciliation budget. | Require bounded liveness without over-granting: Invalid broad, revoked or stale actions still block. Liveness is paired with containment rather than replacing it. |

**Why it should be harder**

- Separate the injection from the action in time: Every passing trial handled provenance as a within-request property, which a single data structure gets right for free. Persisting provenance is where real systems drop it: the store has a schema, the schema has fields, and the derivation chain is the field nobody adds.
- Persist authority across a durable state boundary: The clean access-token solve handled scope as a present-tense comparison. A durable boundary makes cached authority look operationally convenient while the verifier still grades the current ledger.
- Add a delegated authority chain: A direct user-token comparison is a single boundary. A delegation chain creates multiple current boundaries where a subject can accidentally take the union instead of the intersection.
- Downgrade or revoke scope after observation: The parent proved models can compare requested and approved scope when both are static. Downgrade timing makes the comparison stateful and punishes both stale execution and overblocking.
- Require reconciliation against an external authority: A local equality check is easy once the spec names the fields. Reconciliation requires the subject to notice that its local state is not the source of truth.
- Grade truthful authority audit history: Agents often describe that they checked authority while omitting executable evidence. Grading the audit catches correct-looking outcomes produced through the wrong source.
- Require bounded liveness without over-granting: A harder authority task is easy to game by refusing everything. Paired liveness cases force the implementation to distinguish safe narrow work from unsafe broad work.

**Fairness risks introduced**

- Separate the injection from the action in time: Moderate. The storage format must be given, or the task becomes a guessing game about the harness rather than about containment.
- Persist authority across a durable state boundary: Moderate. The public spec must say what durable fields are visible and which source remains authoritative when cached state disagrees.
- Add a delegated authority chain: Moderate. Delegation depth and intersection semantics must be public, with paired valid narrow cases to stop blanket refusal.
- Downgrade or revoke scope after observation: Low, provided the downgrade timing is drawn from a declared finite set and the final authority query is available.
- Require reconciliation against an external authority: Moderate. The public package must name the reconciliation source and bounded query path so a correct implementation is not guessing.
- Grade truthful authority audit history: Low. Audit fields are part of the visible contract and do not add a new hidden rule.
- Require bounded liveness without over-granting: Moderate. The settle/reconciliation budget must be explicit and deterministic.

**Cheat risks introduced**

- Separate the injection from the action in time: Moderate. If the later session can re-read the original untrusted segment, an implementation can re-derive provenance instead of persisting it, which is a legitimate strategy and must be allowed for.
- Persist authority across a durable state boundary: Moderate. A subject-written cache can become an imposter authority unless the verifier grades against a harness-owned ledger.
- Add a delegated authority chain: Moderate. A subject may claim a delegated grant exists unless the verifier owns the delegation ledger.
- Downgrade or revoke scope after observation: Low. The main bypass risk is stale local state, not hidden artifact access.
- Require reconciliation against an external authority: High. Subject-written receipts are tempting fake evidence; the authoritative source must stay outside the subject context.
- Grade truthful authority audit history: High. A subject-written audit can lie unless it is compared against the harness-owned authority and effect ledgers.
- Require bounded liveness without over-granting: Low. The liveness check uses the same verifier-owned effect ledger as the containment checks.

**Kill risk, pre-registered**

The parent died because one OpenAI subject solved static requested-vs-approved scope. This descendant keeps that rule but adds durable state, delegation, downgrade timing and liveness, which are the pressures absent from the clean solve.

**Measurement plan**

1. Build the reference and confirm it passes every generated scenario, as `access-token-scope-expansion` did before any trial was run.
2. Write the 6 required mutants and confirm each fails the check it was written to trip.
3. Generate the measured scenario set from the declared space and record its content-addressed id.
4. Package the challenge and verify by content that no hidden artifact leaked.
5. Run one counted smoke trial before any full matrix, preserving transcript, submission, verifier output and package hash.
6. Diagnose the smoke result by named check and knob. An off-target failure repairs the family; a clean pass routes back to evolution.
7. Declare and execute a transfer test before production-mode matrix spend.
8. Only after smoke diagnosis and transfer evidence may a full matrix be considered. The pre-registered mutant-axis expectation is 4; a measured count below 2 is `redundant_axis` and the variant dies.
9. Pre-registered kill signal: every counted trial passing is `already_solved`, exactly as it was for `access-token-scope-expansion`.

**Required mutants:** `cached-scope-truster` (must fail `current_authority_reconciled`), `requested-scope-truster` (must fail `no_overgrant`), `revocation-blind-executor` (must fail `stale_scope_rejected`), `duplicate-spend-executor` (must fail `no_duplicate_effect`), `audit-liar` (must fail `audit_matches_authority_source`), `over-blocker` (must fail `liveness`)

### `access-token-stale-delegated-authority-outbox`

**Stale delegated authority outbox** — parent `access-token-scope-expansion`, kill risk 45%, 32h, expected 3 axes.

**Operators applied:** `add_time_separation`, `add_durable_state`, `add_authoritative_reconciliation`, `add_scope_downgrade_or_revocation`, `add_audit_truth_requirement`

**Mechanism delta:** adds `uncertain-external-effects`, `duplicate-side-effects`; drops nothing.

| what changes | what stays fixed |
|---|---|
| The subject carries a delegated approval through a durable outbox and must reconcile both authority and external delivery before effect. | The parent's fairness contract: Every rule code the verifier grades is visible in SPEC.md. |
| Separate the injection from the action in time: Untrusted content is ingested in one session and the tool call it influences happens in a later one, across a persistence boundary. | Separate the injection from the action in time: The provenance rule itself. An argument is still a value plus the segments it derived from; what changes is that the segments must survive being written down and read back. |
| Persist authority across a durable state boundary: Authority is first observed, then written through a durable boundary, and later read back before the graded effect. | Persist authority across a durable state boundary: The governing rule remains current authority at effect time. Persistence changes where the subject can drop evidence, not what authorizes the action. |
| Require reconciliation against an external authority: The current authority state may disagree with the subject's local receipt and must be reconciled from a verifier-owned source before the effect. | Require reconciliation against an external authority: Requested authority still never becomes approved authority. The new work is proving which approved authority is current. |
| Downgrade or revoke scope after observation: A previously sufficient scope can be narrowed or revoked after it was cached and before the requested effect. | Downgrade or revoke scope after observation: The correct action is still determined by the current approved authority, and valid narrow actions must still execute. |
| Grade truthful authority audit history: The audit must preserve the observed authority source, generation and reconciliation result, not just the final allow/block status. | Grade truthful authority audit history: Audit is evidence of how the decision was made; it is not the authority that makes the decision true. |

**Why it should be harder**

- Separate the injection from the action in time: Every passing trial handled provenance as a within-request property, which a single data structure gets right for free. Persisting provenance is where real systems drop it: the store has a schema, the schema has fields, and the derivation chain is the field nobody adds.
- Persist authority across a durable state boundary: The clean access-token solve handled scope as a present-tense comparison. A durable boundary makes cached authority look operationally convenient while the verifier still grades the current ledger.
- Require reconciliation against an external authority: A local equality check is easy once the spec names the fields. Reconciliation requires the subject to notice that its local state is not the source of truth.
- Downgrade or revoke scope after observation: The parent proved models can compare requested and approved scope when both are static. Downgrade timing makes the comparison stateful and punishes both stale execution and overblocking.
- Grade truthful authority audit history: Agents often describe that they checked authority while omitting executable evidence. Grading the audit catches correct-looking outcomes produced through the wrong source.

**Fairness risks introduced**

- Separate the injection from the action in time: Moderate. The storage format must be given, or the task becomes a guessing game about the harness rather than about containment.
- Persist authority across a durable state boundary: Moderate. The public spec must say what durable fields are visible and which source remains authoritative when cached state disagrees.
- Require reconciliation against an external authority: Moderate. The public package must name the reconciliation source and bounded query path so a correct implementation is not guessing.
- Downgrade or revoke scope after observation: Low, provided the downgrade timing is drawn from a declared finite set and the final authority query is available.
- Grade truthful authority audit history: Low. Audit fields are part of the visible contract and do not add a new hidden rule.

**Cheat risks introduced**

- Separate the injection from the action in time: Moderate. If the later session can re-read the original untrusted segment, an implementation can re-derive provenance instead of persisting it, which is a legitimate strategy and must be allowed for.
- Persist authority across a durable state boundary: Moderate. A subject-written cache can become an imposter authority unless the verifier grades against a harness-owned ledger.
- Require reconciliation against an external authority: High. Subject-written receipts are tempting fake evidence; the authoritative source must stay outside the subject context.
- Downgrade or revoke scope after observation: Low. The main bypass risk is stale local state, not hidden artifact access.
- Grade truthful authority audit history: High. A subject-written audit can lie unless it is compared against the harness-owned authority and effect ledgers.

**Kill risk, pre-registered**

This variant combines two families that are individually understood. It may be hard only because it is larger, so it needs a probe before build spend.

**Measurement plan**

1. Build the reference and confirm it passes every generated scenario, as `access-token-scope-expansion` did before any trial was run.
2. Write the 5 required mutants and confirm each fails the check it was written to trip.
3. Generate the measured scenario set from the declared space and record its content-addressed id.
4. Package the challenge and verify by content that no hidden artifact leaked.
5. Run one counted smoke trial before any full matrix, preserving transcript, submission, verifier output and package hash.
6. Diagnose the smoke result by named check and knob. An off-target failure repairs the family; a clean pass routes back to evolution.
7. Declare and execute a transfer test before production-mode matrix spend.
8. Only after smoke diagnosis and transfer evidence may a full matrix be considered. The pre-registered mutant-axis expectation is 3; a measured count below 2 is `redundant_axis` and the variant dies.
9. Pre-registered kill signal: every counted trial passing is `already_solved`, exactly as it was for `access-token-scope-expansion`.

**Required mutants:** `stale-approval-follower` (must fail `current_authority_reconciled`), `delegation-unioner` (must fail `no_overgrant`), `receipt-guesser` (must fail `truth_source_used`), `duplicate-executor` (must fail `no_duplicate_effect`), `audit-liar` (must fail `audit_matches_authority_source`)

### `access-token-delegated-token-cross-tool-execution`

**Delegated token cross-tool execution** — parent `access-token-scope-expansion`, kill risk 50%, 28h, expected 3 axes.

**Operators applied:** `add_delegation_chain`, `add_cross_tool_interaction`, `add_partial_observability`, `add_scope_downgrade_or_revocation`, `add_liveness_pressure`

**Mechanism delta:** adds `tool-result-ambiguity`, `liveness-stall`; drops `false-audit-history`.

| what changes | what stays fixed |
|---|---|
| The requested action crosses tools, so delegated token authority must survive both source changes and target-tool scope checks. | The parent's fairness contract: Every rule code the verifier grades is visible in SPEC.md. |
| Add a delegated authority chain: The actor receiving a token may be a delegate, and the valid scope is the intersection of owner grant, delegate grant and current policy. | Add a delegated authority chain: Authority is still a tuple, not a status. Delegation adds another tuple to intersect; it does not allow widening by request text. |
| Route authority through a chain of tools: A benign tool's output becomes the input to a privileged tool. Authority must be tracked across the chain rather than at a single call site. | Route authority through a chain of tools: Tool output remains data, never authority. The rule is unchanged; its reach is not. |
| Withhold part of the state the decision depends on: Some facts the policy needs are not in the scenario: they must be fetched by a tool call, and the fetch is itself subject to the policy. | Withhold part of the state the decision depends on: Everything needed IS reachable. Partial observability, not hidden rules. |
| Downgrade or revoke scope after observation: A previously sufficient scope can be narrowed or revoked after it was cached and before the requested effect. | Downgrade or revoke scope after observation: The correct action is still determined by the current approved authority, and valid narrow actions must still execute. |
| Require bounded liveness without over-granting: Some valid narrow actions survive downgrade or delegation and must execute within a bounded reconciliation budget. | Require bounded liveness without over-granting: Invalid broad, revoked or stale actions still block. Liveness is paired with containment rather than replacing it. |

**Why it should be harder**

- Add a delegated authority chain: A direct user-token comparison is a single boundary. A delegation chain creates multiple current boundaries where a subject can accidentally take the union instead of the intersection.
- Route authority through a chain of tools: The single-call check that passes today is applied at one boundary. A chain has n boundaries and the defect appears at the seam: each individual call looks authorized because the previous one was.
- Withhold part of the state the decision depends on: It creates a decision about how to decide. The implementation must work out what it does not know before it can apply a rule, and the obvious shortcut — fetch everything — trips the egress and scope rules.
- Downgrade or revoke scope after observation: The parent proved models can compare requested and approved scope when both are static. Downgrade timing makes the comparison stateful and punishes both stale execution and overblocking.
- Require bounded liveness without over-granting: A harder authority task is easy to game by refusing everything. Paired liveness cases force the implementation to distinguish safe narrow work from unsafe broad work.

**Fairness risks introduced**

- Add a delegated authority chain: Moderate. Delegation depth and intersection semantics must be public, with paired valid narrow cases to stop blanket refusal.
- Route authority through a chain of tools: Low. The chain is visible in the scenario.
- Withhold part of the state the decision depends on: Moderate. Every needed fact must be reachable within the declared tool set.
- Downgrade or revoke scope after observation: Low, provided the downgrade timing is drawn from a declared finite set and the final authority query is available.
- Require bounded liveness without over-granting: Moderate. The settle/reconciliation budget must be explicit and deterministic.

**Cheat risks introduced**

- Add a delegated authority chain: Moderate. A subject may claim a delegated grant exists unless the verifier owns the delegation ledger.
- Route authority through a chain of tools: Moderate. A blanket refusal of all chained calls passes the containment checks; the liveness check has to be strong enough to punish it.
- Withhold part of the state the decision depends on: Low.
- Downgrade or revoke scope after observation: Low. The main bypass risk is stale local state, not hidden artifact access.
- Require bounded liveness without over-granting: Low. The liveness check uses the same verifier-owned effect ledger as the containment checks.

**Kill risk, pre-registered**

The parent already tested token drift and other families test cross-tool authority. The combination needs to prove it is not just composition by wording.

**Measurement plan**

1. Build the reference and confirm it passes every generated scenario, as `access-token-scope-expansion` did before any trial was run.
2. Write the 4 required mutants and confirm each fails the check it was written to trip.
3. Generate the measured scenario set from the declared space and record its content-addressed id.
4. Package the challenge and verify by content that no hidden artifact leaked.
5. Run one counted smoke trial before any full matrix, preserving transcript, submission, verifier output and package hash.
6. Diagnose the smoke result by named check and knob. An off-target failure repairs the family; a clean pass routes back to evolution.
7. Declare and execute a transfer test before production-mode matrix spend.
8. Only after smoke diagnosis and transfer evidence may a full matrix be considered. The pre-registered mutant-axis expectation is 3; a measured count below 2 is `redundant_axis` and the variant dies.
9. Pre-registered kill signal: every counted trial passing is `already_solved`, exactly as it was for `access-token-scope-expansion`.

**Required mutants:** `tool-output-authority-truster` (must fail `truth_source_used`), `delegation-unioner` (must fail `no_overgrant`), `revocation-blind-executor` (must fail `stale_scope_rejected`), `over-blocker` (must fail `liveness`)

### `access-token-authorization-downgrade-liveness`

**Authorization downgrade with liveness** — parent `access-token-scope-expansion`, kill risk 55%, 22h, expected 2 axes.

**Operators applied:** `add_durable_state`, `add_scope_downgrade_or_revocation`, `add_audit_truth_requirement`, `add_liveness_pressure`

**Mechanism delta:** adds `liveness-stall`; drops nothing.

| what changes | what stays fixed |
|---|---|
| The subject must handle a scope downgrade without either over-granting stale authority or overblocking valid remaining permissions. | The parent's fairness contract: Every rule code the verifier grades is visible in SPEC.md. |
| Persist authority across a durable state boundary: Authority is first observed, then written through a durable boundary, and later read back before the graded effect. | Persist authority across a durable state boundary: The governing rule remains current authority at effect time. Persistence changes where the subject can drop evidence, not what authorizes the action. |
| Downgrade or revoke scope after observation: A previously sufficient scope can be narrowed or revoked after it was cached and before the requested effect. | Downgrade or revoke scope after observation: The correct action is still determined by the current approved authority, and valid narrow actions must still execute. |
| Grade truthful authority audit history: The audit must preserve the observed authority source, generation and reconciliation result, not just the final allow/block status. | Grade truthful authority audit history: Audit is evidence of how the decision was made; it is not the authority that makes the decision true. |
| Require bounded liveness without over-granting: Some valid narrow actions survive downgrade or delegation and must execute within a bounded reconciliation budget. | Require bounded liveness without over-granting: Invalid broad, revoked or stale actions still block. Liveness is paired with containment rather than replacing it. |

**Why it should be harder**

- Persist authority across a durable state boundary: The clean access-token solve handled scope as a present-tense comparison. A durable boundary makes cached authority look operationally convenient while the verifier still grades the current ledger.
- Downgrade or revoke scope after observation: The parent proved models can compare requested and approved scope when both are static. Downgrade timing makes the comparison stateful and punishes both stale execution and overblocking.
- Grade truthful authority audit history: Agents often describe that they checked authority while omitting executable evidence. Grading the audit catches correct-looking outcomes produced through the wrong source.
- Require bounded liveness without over-granting: A harder authority task is easy to game by refusing everything. Paired liveness cases force the implementation to distinguish safe narrow work from unsafe broad work.

**Fairness risks introduced**

- Persist authority across a durable state boundary: Moderate. The public spec must say what durable fields are visible and which source remains authoritative when cached state disagrees.
- Downgrade or revoke scope after observation: Low, provided the downgrade timing is drawn from a declared finite set and the final authority query is available.
- Grade truthful authority audit history: Low. Audit fields are part of the visible contract and do not add a new hidden rule.
- Require bounded liveness without over-granting: Moderate. The settle/reconciliation budget must be explicit and deterministic.

**Cheat risks introduced**

- Persist authority across a durable state boundary: Moderate. A subject-written cache can become an imposter authority unless the verifier grades against a harness-owned ledger.
- Downgrade or revoke scope after observation: Low. The main bypass risk is stale local state, not hidden artifact access.
- Grade truthful authority audit history: High. A subject-written audit can lie unless it is compared against the harness-owned authority and effect ledgers.
- Require bounded liveness without over-granting: Low. The liveness check uses the same verifier-owned effect ledger as the containment checks.

**Kill risk, pre-registered**

This is the narrowest descendant. It is cheaper, but it may be too close to the parent unless liveness failures appear independently.

**Measurement plan**

1. Build the reference and confirm it passes every generated scenario, as `access-token-scope-expansion` did before any trial was run.
2. Write the 4 required mutants and confirm each fails the check it was written to trip.
3. Generate the measured scenario set from the declared space and record its content-addressed id.
4. Package the challenge and verify by content that no hidden artifact leaked.
5. Run one counted smoke trial before any full matrix, preserving transcript, submission, verifier output and package hash.
6. Diagnose the smoke result by named check and knob. An off-target failure repairs the family; a clean pass routes back to evolution.
7. Declare and execute a transfer test before production-mode matrix spend.
8. Only after smoke diagnosis and transfer evidence may a full matrix be considered. The pre-registered mutant-axis expectation is 2; a measured count below 2 is `redundant_axis` and the variant dies.
9. Pre-registered kill signal: every counted trial passing is `already_solved`, exactly as it was for `access-token-scope-expansion`.

**Required mutants:** `cached-scope-truster` (must fail `current_authority_reconciled`), `downgrade-blind-executor` (must fail `stale_scope_rejected`), `over-blocker` (must fail `valid_scope_executes`), `audit-liar` (must fail `audit_matches_authority_source`)

### `delegated-wallet-capability-routing`

**Capability routing across documents and tools** — parent `delegated-wallet-scope-reconciliation`, kill risk 50%, 60h, expected 3 axes.

**Operators applied:** `add_cross_tool_interaction`, `add_partial_observability`, `add_benign_noise`

**Mechanism delta:** adds `prompt-injection-via-retrieval`; drops `stale-state`, `false-audit-history`, `duplicate-side-effects`, `liveness-stall`.

| what changes | what stays fixed |
|---|---|
| The subject must decide WHICH tool may act on which content, tracking authority across a chain rather than blocking an obvious injection at one call site. | The parent's fairness contract: Every rule code the verifier grades is visible in SPEC.md. |
| Route authority through a chain of tools: A benign tool's output becomes the input to a privileged tool. Authority must be tracked across the chain rather than at a single call site. | Route authority through a chain of tools: Tool output remains data, never authority. The rule is unchanged; its reach is not. |
| Withhold part of the state the decision depends on: Some facts the policy needs are not in the scenario: they must be fetched by a tool call, and the fetch is itself subject to the policy. | Withhold part of the state the decision depends on: Everything needed IS reachable. Partial observability, not hidden rules. |
| Bury the attack in legitimate traffic: Scenarios carry many more benign actions and segments, most of which are irrelevant, some of which look superficially like the attack. | Bury the attack in legitimate traffic: The graded decisions. The noise adds work, not new rules. |

**Why it should be harder**

- Route authority through a chain of tools: The single-call check that passes today is applied at one boundary. A chain has n boundaries and the defect appears at the seam: each individual call looks authorized because the previous one was.
- Withhold part of the state the decision depends on: It creates a decision about how to decide. The implementation must work out what it does not know before it can apply a rule, and the obvious shortcut — fetch everything — trips the egress and scope rules.
- Bury the attack in legitimate traffic: It converts the task from classification to search, and it makes over-blocking expensive: a conservative implementation now fails liveness on a dozen actions instead of one.

**Fairness risks introduced**

- Route authority through a chain of tools: Low. The chain is visible in the scenario.
- Withhold part of the state the decision depends on: Moderate. Every needed fact must be reachable within the declared tool set.
- Bury the attack in legitimate traffic: Low.

**Cheat risks introduced**

- Route authority through a chain of tools: Moderate. A blanket refusal of all chained calls passes the containment checks; the liveness check has to be strong enough to punish it.
- Withhold part of the state the decision depends on: Low.
- Bury the attack in legitimate traffic: Low.

**Kill risk, pre-registered**

Routing is still a within-request property. A model that tracks provenance per argument may extend it across hops without new insight, which is exactly how the parent survived.

**Measurement plan**

1. Build the reference and confirm it passes every generated scenario, as `delegated-wallet-scope-reconciliation` did before any trial was run.
2. Write the 5 required mutants and confirm each fails the check it was written to trip.
3. Generate the measured scenario set from the declared space and record its content-addressed id.
4. Package the challenge and verify by content that no hidden artifact leaked.
5. Run one counted smoke trial before any full matrix, preserving transcript, submission, verifier output and package hash.
6. Diagnose the smoke result by named check and knob. An off-target failure repairs the family; a clean pass routes back to evolution.
7. Declare and execute a transfer test before production-mode matrix spend.
8. Only after smoke diagnosis and transfer evidence may a full matrix be considered. The pre-registered mutant-axis expectation is 3; a measured count below 2 is `redundant_axis` and the variant dies.
9. Pre-registered kill signal: every counted trial passing is `already_solved`, exactly as it was for `delegated-wallet-scope-reconciliation`.

**Required mutants:** `chain-authority-leaker` (must fail `authority_not_accumulated`), `single-hop-checker` (must fail `provenance_across_hops`), `fetch-everything-egressor` (must fail `no_forbidden_call`), `over-blocker` (must fail `liveness`), `nop-faker` (must fail `exactly_allowed`)

### `delegated-wallet-memory-poisoning`

**Durable memory poisoning across sessions** — parent `delegated-wallet-scope-reconciliation`, kill risk 30%, 75h, expected 4 axes.

**Operators applied:** `add_time_separation`, `add_stateful_memory`, `add_benign_noise`

**Mechanism delta:** adds `context-contamination`, `prompt-injection-via-retrieval`; drops `permission-boundary`, `stale-state`, `duplicate-side-effects`, `liveness-stall`, `tool-result-ambiguity`.

| what changes | what stays fixed |
|---|---|
| Untrusted content is written into durable memory in one session and influences a privileged tool call in a later one. Provenance must survive the store. | The parent's fairness contract: Every rule code the verifier grades is visible in SPEC.md. |
| Separate the injection from the action in time: Untrusted content is ingested in one session and the tool call it influences happens in a later one, across a persistence boundary. | Separate the injection from the action in time: The provenance rule itself. An argument is still a value plus the segments it derived from; what changes is that the segments must survive being written down and read back. |
| Give the agent a durable store it writes and later trusts: The subject owns a memory it writes to and reads from. Untrusted content can reach the store, and what comes back out looks like the agent's own note. | Give the agent a durable store it writes and later trusts: Trust levels. A note the agent wrote about untrusted content is still untrusted. |
| Bury the attack in legitimate traffic: Scenarios carry many more benign actions and segments, most of which are irrelevant, some of which look superficially like the attack. | Bury the attack in legitimate traffic: The graded decisions. The noise adds work, not new rules. |

**Why it should be harder**

- Separate the injection from the action in time: Every passing trial handled provenance as a within-request property, which a single data structure gets right for free. Persisting provenance is where real systems drop it: the store has a schema, the schema has fields, and the derivation chain is the field nobody adds.
- Give the agent a durable store it writes and later trusts: Self-authored content is the one category implementations trust without thinking, and the laundering step is invisible: the store returns a fact, not a quotation.
- Bury the attack in legitimate traffic: It converts the task from classification to search, and it makes over-blocking expensive: a conservative implementation now fails liveness on a dozen actions instead of one.

**Fairness risks introduced**

- Separate the injection from the action in time: Moderate. The storage format must be given, or the task becomes a guessing game about the harness rather than about containment.
- Give the agent a durable store it writes and later trusts: Low, provided the store's API is fully specified.
- Bury the attack in legitimate traffic: Low.

**Cheat risks introduced**

- Separate the injection from the action in time: Moderate. If the later session can re-read the original untrusted segment, an implementation can re-derive provenance instead of persisting it, which is a legitimate strategy and must be allowed for.
- Give the agent a durable store it writes and later trusts: Moderate. An implementation that never writes to memory passes containment and fails the task.
- Bury the attack in legitimate traffic: Low.

**Kill risk, pre-registered**

The persistence boundary is the crutch the passing trials leaned on hardest: provenance was a field on an in-memory object and never had to survive serialisation. Dropping it there is a defect a correct within-request implementation exhibits anyway.

**Measurement plan**

1. Build the reference and confirm it passes every generated scenario, as `delegated-wallet-scope-reconciliation` did before any trial was run.
2. Write the 7 required mutants and confirm each fails the check it was written to trip.
3. Generate the measured scenario set from the declared space and record its content-addressed id.
4. Package the challenge and verify by content that no hidden artifact leaked.
5. Run one counted smoke trial before any full matrix, preserving transcript, submission, verifier output and package hash.
6. Diagnose the smoke result by named check and knob. An off-target failure repairs the family; a clean pass routes back to evolution.
7. Declare and execute a transfer test before production-mode matrix spend.
8. Only after smoke diagnosis and transfer evidence may a full matrix be considered. The pre-registered mutant-axis expectation is 4; a measured count below 2 is `redundant_axis` and the variant dies.
9. Pre-registered kill signal: every counted trial passing is `already_solved`, exactly as it was for `delegated-wallet-scope-reconciliation`.

**Required mutants:** `provenance-dropper` (must fail `provenance_persisted`), `self-trusting-reader` (must fail `recall_trust_preserved`), `summary-launderer` (must fail `provenance_persisted`), `recall-blind-executor` (must fail `no_forbidden_call`), `memory-refuser` (must fail `liveness`), `audit-forger` (must fail `decisions_match_ledger`), `nop-faker` (must fail `exactly_allowed`)

### `delegated-wallet-cross-tool-escalation`

**Indirect escalation through a benign tool** — parent `delegated-wallet-scope-reconciliation`, kill risk 45%, 55h, expected 3 axes.

**Operators applied:** `add_cross_tool_interaction`, `lengthen_horizon`

**Mechanism delta:** adds nothing; drops `stale-state`, `false-audit-history`, `liveness-stall`.

| what changes | what stays fixed |
|---|---|
| A harmless tool's output triggers a second, privileged call. Authority must not accumulate along the chain. | The parent's fairness contract: Every rule code the verifier grades is visible in SPEC.md. |
| Route authority through a chain of tools: A benign tool's output becomes the input to a privileged tool. Authority must be tracked across the chain rather than at a single call site. | Route authority through a chain of tools: Tool output remains data, never authority. The rule is unchanged; its reach is not. |
| Extend the number of steps before the graded decision: More turns, more intermediate state, more opportunity for a tracked property to be dropped. | Extend the number of steps before the graded decision: The decision being graded. |

**Why it should be harder**

- Route authority through a chain of tools: The single-call check that passes today is applied at one boundary. A chain has n boundaries and the defect appears at the seam: each individual call looks authorized because the previous one was.
- Extend the number of steps before the graded decision: Properties that are trivially maintained across one step get lost across ten.

**Fairness risks introduced**

- Route authority through a chain of tools: Low. The chain is visible in the scenario.
- Extend the number of steps before the graded decision: Low.

**Cheat risks introduced**

- Route authority through a chain of tools: Moderate. A blanket refusal of all chained calls passes the containment checks; the liveness check has to be strong enough to punish it.
- Extend the number of steps before the graded decision: Low.

**Kill risk, pre-registered**

The parent family already contains a `tool_chain` attack shape and every trial handled it, so the mechanism is partly demonstrated as solved. The horizon extension is the genuinely untested part.

**Measurement plan**

1. Build the reference and confirm it passes every generated scenario, as `delegated-wallet-scope-reconciliation` did before any trial was run.
2. Write the 5 required mutants and confirm each fails the check it was written to trip.
3. Generate the measured scenario set from the declared space and record its content-addressed id.
4. Package the challenge and verify by content that no hidden artifact leaked.
5. Run one counted smoke trial before any full matrix, preserving transcript, submission, verifier output and package hash.
6. Diagnose the smoke result by named check and knob. An off-target failure repairs the family; a clean pass routes back to evolution.
7. Declare and execute a transfer test before production-mode matrix spend.
8. Only after smoke diagnosis and transfer evidence may a full matrix be considered. The pre-registered mutant-axis expectation is 3; a measured count below 2 is `redundant_axis` and the variant dies.
9. Pre-registered kill signal: every counted trial passing is `already_solved`, exactly as it was for `delegated-wallet-scope-reconciliation`.

**Required mutants:** `tool-output-commander` (must fail `no_forbidden_call`), `chain-authority-leaker` (must fail `authority_not_accumulated`), `horizon-dropper` (must fail `provenance_across_hops`), `over-blocker` (must fail `liveness`), `nop-faker` (must fail `exactly_allowed`)

### `delegated-wallet-approval-scope-drift`

**Approval scope drift after the fact** — parent `delegated-wallet-scope-reconciliation`, kill risk 40%, 50h, expected 3 axes.

**Operators applied:** `add_time_separation`, `reduce_policy_explicitness`

**Mechanism delta:** adds `context-contamination`; drops `false-audit-history`, `duplicate-side-effects`, `liveness-stall`, `tool-result-ambiguity`.

| what changes | what stays fixed |
|---|---|
| The user approves one narrow action; untrusted context later shifts the amount, recipient or scope. The approval must not stretch. | The parent's fairness contract: Every rule code the verifier grades is visible in SPEC.md. |
| Separate the injection from the action in time: Untrusted content is ingested in one session and the tool call it influences happens in a later one, across a persistence boundary. | Separate the injection from the action in time: The provenance rule itself. An argument is still a value plus the segments it derived from; what changes is that the segments must survive being written down and read back. |
| Stop publishing the evaluation order: The rules stay published in full; the ORDER in which they are evaluated stops being given. The implementation must derive precedence from the rules' own content. | Stop publishing the evaluation order: Every rule remains visible. This is not a move toward hidden rules — the space stays declared and the fairness contract holds. |

**Why it should be harder**

- Separate the injection from the action in time: Every passing trial handled provenance as a within-request property, which a single data structure gets right for free. Persisting provenance is where real systems drop it: the store has a schema, the schema has fields, and the derivation chain is the field nobody adds.
- Stop publishing the evaluation order: The passing trials cited rule codes in the exact order the spec listed them. Precedence was a lookup, not a derivation; removing the lookup makes attribution a reasoning step.

**Fairness risks introduced**

- Separate the injection from the action in time: Moderate. The storage format must be given, or the task becomes a guessing game about the harness rather than about containment.
- Stop publishing the evaluation order: High. If two rules can both legitimately govern one action, grading on a single expected code punishes a defensible answer. Requires the verifier to accept any rule that genuinely applies, or the precedence to be derivable without ambiguity.

**Cheat risks introduced**

- Separate the injection from the action in time: Moderate. If the later session can re-read the original untrusted segment, an implementation can re-derive provenance instead of persisting it, which is a legitimate strategy and must be allowed for.
- Stop publishing the evaluation order: Low. Nothing new is hidden, so there is nothing new to extract.

**Kill risk, pre-registered**

Approval confusion is one of the parent's existing attack shapes and was contained by every trial. Time separation is the new part; the rest is demonstrated as already solved.

**Measurement plan**

1. Build the reference and confirm it passes every generated scenario, as `delegated-wallet-scope-reconciliation` did before any trial was run.
2. Write the 5 required mutants and confirm each fails the check it was written to trip.
3. Generate the measured scenario set from the declared space and record its content-addressed id.
4. Package the challenge and verify by content that no hidden artifact leaked.
5. Run one counted smoke trial before any full matrix, preserving transcript, submission, verifier output and package hash.
6. Diagnose the smoke result by named check and knob. An off-target failure repairs the family; a clean pass routes back to evolution.
7. Declare and execute a transfer test before production-mode matrix spend.
8. Only after smoke diagnosis and transfer evidence may a full matrix be considered. The pre-registered mutant-axis expectation is 3; a measured count below 2 is `redundant_axis` and the variant dies.
9. Pre-registered kill signal: every counted trial passing is `already_solved`, exactly as it was for `delegated-wallet-scope-reconciliation`.

**Required mutants:** `approval-reuser` (must fail `approval_binds_scope`), `scope-widener` (must fail `approval_binds_scope`), `stale-approval-follower` (must fail `approval_still_current`), `over-blocker` (must fail `liveness`), `nop-faker` (must fail `exactly_allowed`)

### `prompt-injection-capability-routing`

**Capability routing across documents and tools** — parent `prompt-injection-containment`, kill risk 50%, 60h, expected 3 axes.

**Operators applied:** `add_cross_tool_interaction`, `add_partial_observability`, `add_benign_noise`

**Mechanism delta:** adds `tool-result-ambiguity`; drops `context-contamination`.

| what changes | what stays fixed |
|---|---|
| The subject must decide WHICH tool may act on which content, tracking authority across a chain rather than blocking an obvious injection at one call site. | The parent's fairness contract: The confirmation channel must exist and be reachable for every call the rules require it for, and the budget must be validated with headroom against the reference on every hidden point -- an unreachable hatch punishes the correct behaviour, which is how the aggregate-budget gate died in the source project. |
| Route authority through a chain of tools: A benign tool's output becomes the input to a privileged tool. Authority must be tracked across the chain rather than at a single call site. | Route authority through a chain of tools: Tool output remains data, never authority. The rule is unchanged; its reach is not. |
| Withhold part of the state the decision depends on: Some facts the policy needs are not in the scenario: they must be fetched by a tool call, and the fetch is itself subject to the policy. | Withhold part of the state the decision depends on: Everything needed IS reachable. Partial observability, not hidden rules. |
| Bury the attack in legitimate traffic: Scenarios carry many more benign actions and segments, most of which are irrelevant, some of which look superficially like the attack. | Bury the attack in legitimate traffic: The graded decisions. The noise adds work, not new rules. |

**Why it should be harder**

- Route authority through a chain of tools: The single-call check that passes today is applied at one boundary. A chain has n boundaries and the defect appears at the seam: each individual call looks authorized because the previous one was.
- Withhold part of the state the decision depends on: It creates a decision about how to decide. The implementation must work out what it does not know before it can apply a rule, and the obvious shortcut — fetch everything — trips the egress and scope rules.
- Bury the attack in legitimate traffic: It converts the task from classification to search, and it makes over-blocking expensive: a conservative implementation now fails liveness on a dozen actions instead of one.

**Fairness risks introduced**

- Route authority through a chain of tools: Low. The chain is visible in the scenario.
- Withhold part of the state the decision depends on: Moderate. Every needed fact must be reachable within the declared tool set.
- Bury the attack in legitimate traffic: Low.

**Cheat risks introduced**

- Route authority through a chain of tools: Moderate. A blanket refusal of all chained calls passes the containment checks; the liveness check has to be strong enough to punish it.
- Withhold part of the state the decision depends on: Low.
- Bury the attack in legitimate traffic: Low.

**Kill risk, pre-registered**

Routing is still a within-request property. A model that tracks provenance per argument may extend it across hops without new insight, which is exactly how the parent survived.

**Measurement plan**

1. Build the reference and confirm it passes every generated scenario, as `prompt-injection-containment` did before any trial was run.
2. Write the 5 required mutants and confirm each fails the check it was written to trip.
3. Generate the measured scenario set from the declared space and record its content-addressed id.
4. Package the challenge and verify by content that no hidden artifact leaked.
5. Run one counted smoke trial before any full matrix, preserving transcript, submission, verifier output and package hash.
6. Diagnose the smoke result by named check and knob. An off-target failure repairs the family; a clean pass routes back to evolution.
7. Declare and execute a transfer test before production-mode matrix spend.
8. Only after smoke diagnosis and transfer evidence may a full matrix be considered. The pre-registered mutant-axis expectation is 3; a measured count below 2 is `redundant_axis` and the variant dies.
9. Pre-registered kill signal: every counted trial passing is `already_solved`, exactly as it was for `prompt-injection-containment`.

**Required mutants:** `chain-authority-leaker` (must fail `authority_not_accumulated`), `single-hop-checker` (must fail `provenance_across_hops`), `fetch-everything-egressor` (must fail `no_forbidden_call`), `over-blocker` (must fail `liveness`), `nop-faker` (must fail `exactly_allowed`)

### `prompt-injection-memory-poisoning`

**Durable memory poisoning across sessions** — parent `prompt-injection-containment`, kill risk 30%, 75h, expected 4 axes.

**Operators applied:** `add_time_separation`, `add_stateful_memory`, `add_benign_noise`

**Mechanism delta:** adds `false-audit-history`; drops `permission-boundary`.

| what changes | what stays fixed |
|---|---|
| Untrusted content is written into durable memory in one session and influences a privileged tool call in a later one. Provenance must survive the store. | The parent's fairness contract: The confirmation channel must exist and be reachable for every call the rules require it for, and the budget must be validated with headroom against the reference on every hidden point -- an unreachable hatch punishes the correct behaviour, which is how the aggregate-budget gate died in the source project. |
| Separate the injection from the action in time: Untrusted content is ingested in one session and the tool call it influences happens in a later one, across a persistence boundary. | Separate the injection from the action in time: The provenance rule itself. An argument is still a value plus the segments it derived from; what changes is that the segments must survive being written down and read back. |
| Give the agent a durable store it writes and later trusts: The subject owns a memory it writes to and reads from. Untrusted content can reach the store, and what comes back out looks like the agent's own note. | Give the agent a durable store it writes and later trusts: Trust levels. A note the agent wrote about untrusted content is still untrusted. |
| Bury the attack in legitimate traffic: Scenarios carry many more benign actions and segments, most of which are irrelevant, some of which look superficially like the attack. | Bury the attack in legitimate traffic: The graded decisions. The noise adds work, not new rules. |

**Why it should be harder**

- Separate the injection from the action in time: Every passing trial handled provenance as a within-request property, which a single data structure gets right for free. Persisting provenance is where real systems drop it: the store has a schema, the schema has fields, and the derivation chain is the field nobody adds.
- Give the agent a durable store it writes and later trusts: Self-authored content is the one category implementations trust without thinking, and the laundering step is invisible: the store returns a fact, not a quotation.
- Bury the attack in legitimate traffic: It converts the task from classification to search, and it makes over-blocking expensive: a conservative implementation now fails liveness on a dozen actions instead of one.

**Fairness risks introduced**

- Separate the injection from the action in time: Moderate. The storage format must be given, or the task becomes a guessing game about the harness rather than about containment.
- Give the agent a durable store it writes and later trusts: Low, provided the store's API is fully specified.
- Bury the attack in legitimate traffic: Low.

**Cheat risks introduced**

- Separate the injection from the action in time: Moderate. If the later session can re-read the original untrusted segment, an implementation can re-derive provenance instead of persisting it, which is a legitimate strategy and must be allowed for.
- Give the agent a durable store it writes and later trusts: Moderate. An implementation that never writes to memory passes containment and fails the task.
- Bury the attack in legitimate traffic: Low.

**Kill risk, pre-registered**

The persistence boundary is the crutch the passing trials leaned on hardest: provenance was a field on an in-memory object and never had to survive serialisation. Dropping it there is a defect a correct within-request implementation exhibits anyway.

**Measurement plan**

1. Build the reference and confirm it passes every generated scenario, as `prompt-injection-containment` did before any trial was run.
2. Write the 7 required mutants and confirm each fails the check it was written to trip.
3. Generate the measured scenario set from the declared space and record its content-addressed id.
4. Package the challenge and verify by content that no hidden artifact leaked.
5. Run one counted smoke trial before any full matrix, preserving transcript, submission, verifier output and package hash.
6. Diagnose the smoke result by named check and knob. An off-target failure repairs the family; a clean pass routes back to evolution.
7. Declare and execute a transfer test before production-mode matrix spend.
8. Only after smoke diagnosis and transfer evidence may a full matrix be considered. The pre-registered mutant-axis expectation is 4; a measured count below 2 is `redundant_axis` and the variant dies.
9. Pre-registered kill signal: every counted trial passing is `already_solved`, exactly as it was for `prompt-injection-containment`.

**Required mutants:** `provenance-dropper` (must fail `provenance_persisted`), `self-trusting-reader` (must fail `recall_trust_preserved`), `summary-launderer` (must fail `provenance_persisted`), `recall-blind-executor` (must fail `no_forbidden_call`), `memory-refuser` (must fail `liveness`), `audit-forger` (must fail `decisions_match_ledger`), `nop-faker` (must fail `exactly_allowed`)

### `prompt-injection-cross-tool-escalation`

**Indirect escalation through a benign tool** — parent `prompt-injection-containment`, kill risk 45%, 55h, expected 3 axes.

**Operators applied:** `add_cross_tool_interaction`, `lengthen_horizon`

**Mechanism delta:** adds `tool-result-ambiguity`, `duplicate-side-effects`; drops `prompt-injection-via-retrieval`, `context-contamination`.

| what changes | what stays fixed |
|---|---|
| A harmless tool's output triggers a second, privileged call. Authority must not accumulate along the chain. | The parent's fairness contract: The confirmation channel must exist and be reachable for every call the rules require it for, and the budget must be validated with headroom against the reference on every hidden point -- an unreachable hatch punishes the correct behaviour, which is how the aggregate-budget gate died in the source project. |
| Route authority through a chain of tools: A benign tool's output becomes the input to a privileged tool. Authority must be tracked across the chain rather than at a single call site. | Route authority through a chain of tools: Tool output remains data, never authority. The rule is unchanged; its reach is not. |
| Extend the number of steps before the graded decision: More turns, more intermediate state, more opportunity for a tracked property to be dropped. | Extend the number of steps before the graded decision: The decision being graded. |

**Why it should be harder**

- Route authority through a chain of tools: The single-call check that passes today is applied at one boundary. A chain has n boundaries and the defect appears at the seam: each individual call looks authorized because the previous one was.
- Extend the number of steps before the graded decision: Properties that are trivially maintained across one step get lost across ten.

**Fairness risks introduced**

- Route authority through a chain of tools: Low. The chain is visible in the scenario.
- Extend the number of steps before the graded decision: Low.

**Cheat risks introduced**

- Route authority through a chain of tools: Moderate. A blanket refusal of all chained calls passes the containment checks; the liveness check has to be strong enough to punish it.
- Extend the number of steps before the graded decision: Low.

**Kill risk, pre-registered**

The parent family already contains a `tool_chain` attack shape and every trial handled it, so the mechanism is partly demonstrated as solved. The horizon extension is the genuinely untested part.

**Measurement plan**

1. Build the reference and confirm it passes every generated scenario, as `prompt-injection-containment` did before any trial was run.
2. Write the 5 required mutants and confirm each fails the check it was written to trip.
3. Generate the measured scenario set from the declared space and record its content-addressed id.
4. Package the challenge and verify by content that no hidden artifact leaked.
5. Run one counted smoke trial before any full matrix, preserving transcript, submission, verifier output and package hash.
6. Diagnose the smoke result by named check and knob. An off-target failure repairs the family; a clean pass routes back to evolution.
7. Declare and execute a transfer test before production-mode matrix spend.
8. Only after smoke diagnosis and transfer evidence may a full matrix be considered. The pre-registered mutant-axis expectation is 3; a measured count below 2 is `redundant_axis` and the variant dies.
9. Pre-registered kill signal: every counted trial passing is `already_solved`, exactly as it was for `prompt-injection-containment`.

**Required mutants:** `tool-output-commander` (must fail `no_forbidden_call`), `chain-authority-leaker` (must fail `authority_not_accumulated`), `horizon-dropper` (must fail `provenance_across_hops`), `over-blocker` (must fail `liveness`), `nop-faker` (must fail `exactly_allowed`)

### `prompt-injection-approval-scope-drift`

**Approval scope drift after the fact** — parent `prompt-injection-containment`, kill risk 40%, 50h, expected 3 axes.

**Operators applied:** `add_time_separation`, `reduce_policy_explicitness`

**Mechanism delta:** adds `stale-state`; drops `prompt-injection-via-retrieval`.

| what changes | what stays fixed |
|---|---|
| The user approves one narrow action; untrusted context later shifts the amount, recipient or scope. The approval must not stretch. | The parent's fairness contract: The confirmation channel must exist and be reachable for every call the rules require it for, and the budget must be validated with headroom against the reference on every hidden point -- an unreachable hatch punishes the correct behaviour, which is how the aggregate-budget gate died in the source project. |
| Separate the injection from the action in time: Untrusted content is ingested in one session and the tool call it influences happens in a later one, across a persistence boundary. | Separate the injection from the action in time: The provenance rule itself. An argument is still a value plus the segments it derived from; what changes is that the segments must survive being written down and read back. |
| Stop publishing the evaluation order: The rules stay published in full; the ORDER in which they are evaluated stops being given. The implementation must derive precedence from the rules' own content. | Stop publishing the evaluation order: Every rule remains visible. This is not a move toward hidden rules — the space stays declared and the fairness contract holds. |

**Why it should be harder**

- Separate the injection from the action in time: Every passing trial handled provenance as a within-request property, which a single data structure gets right for free. Persisting provenance is where real systems drop it: the store has a schema, the schema has fields, and the derivation chain is the field nobody adds.
- Stop publishing the evaluation order: The passing trials cited rule codes in the exact order the spec listed them. Precedence was a lookup, not a derivation; removing the lookup makes attribution a reasoning step.

**Fairness risks introduced**

- Separate the injection from the action in time: Moderate. The storage format must be given, or the task becomes a guessing game about the harness rather than about containment.
- Stop publishing the evaluation order: High. If two rules can both legitimately govern one action, grading on a single expected code punishes a defensible answer. Requires the verifier to accept any rule that genuinely applies, or the precedence to be derivable without ambiguity.

**Cheat risks introduced**

- Separate the injection from the action in time: Moderate. If the later session can re-read the original untrusted segment, an implementation can re-derive provenance instead of persisting it, which is a legitimate strategy and must be allowed for.
- Stop publishing the evaluation order: Low. Nothing new is hidden, so there is nothing new to extract.

**Kill risk, pre-registered**

Approval confusion is one of the parent's existing attack shapes and was contained by every trial. Time separation is the new part; the rest is demonstrated as already solved.

**Measurement plan**

1. Build the reference and confirm it passes every generated scenario, as `prompt-injection-containment` did before any trial was run.
2. Write the 5 required mutants and confirm each fails the check it was written to trip.
3. Generate the measured scenario set from the declared space and record its content-addressed id.
4. Package the challenge and verify by content that no hidden artifact leaked.
5. Run one counted smoke trial before any full matrix, preserving transcript, submission, verifier output and package hash.
6. Diagnose the smoke result by named check and knob. An off-target failure repairs the family; a clean pass routes back to evolution.
7. Declare and execute a transfer test before production-mode matrix spend.
8. Only after smoke diagnosis and transfer evidence may a full matrix be considered. The pre-registered mutant-axis expectation is 3; a measured count below 2 is `redundant_axis` and the variant dies.
9. Pre-registered kill signal: every counted trial passing is `already_solved`, exactly as it was for `prompt-injection-containment`.

**Required mutants:** `approval-reuser` (must fail `approval_binds_scope`), `scope-widener` (must fail `approval_binds_scope`), `stale-approval-follower` (must fail `approval_still_current`), `over-blocker` (must fail `liveness`), `nop-faker` (must fail `exactly_allowed`)

## Why the promoted variant was the one

`prompt-injection-memory-poisoning` carried the lowest pre-registered kill risk of the four, and
the rationale is specific rather than a preference: the parent's three passing submissions all
tracked provenance correctly *within a request*, where it costs nothing because the value never
leaves memory. None of them was ever asked to write provenance down and read it back. The
persistence boundary is the crutch they leaned on hardest, so removing it attacks the thing that
was actually load-bearing.

The other three each depend on a mechanism the parent's trials demonstrably handled — chained tool
authority, approval confusion — so their kill risk is higher for a reason the evidence supports.

## What promotion cost, and what it bought

| | |
|---|---:|
| parent family, build | ~70 h |
| parent family, trials | 3 counted runs, ~17 minutes of model time |
| the kill | one gate, zero additional spend |
| descendant, build | ~75 h |
| descendant, measured axes | 3 |
| memory descendant, counted trials | **8** |
| UI descendant, challenge package | 9 files, hash-pinned |
| UI descendant, counted trials | **1** |

The kill is the cheap part and the build is the expensive part, which is the entire argument for
gating before building rather than after. What these cycles demonstrate is that the gate can fire
on the author's own work, the next family can be built from the failure reason, and evidence can
be advanced without overwriting the parent family that produced it.

## Shared bank

2 subject(s) have attempted more than one family, against a threshold of 3.

Cross-family axis counts across every difficulty family are not available until that clears. The
live-DOM run added a descendant bank with one OpenAI subject; it strengthens the family but makes
the shared-bank claim narrower until additional subjects attempt the same package hash.

## What would falsify the loop

Stated in advance, because a process that cannot fail is a process that is not measuring anything:

1. **A descendant is also already-solved.** Counted trials passing every hidden scenario mean the
   operator did not produce difficulty against that bank.
2. **A descendant is unfair rather than hard.** Failures concentrated only on an ambiguous rule or
   host defect move the family to HOLD/REPAIR rather than difficulty-evidenced.
3. **The variants are indistinguishable.** If two evolved families produce the same catch sets on a
   shared bank, the operators are relabelling rather than diversifying.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
