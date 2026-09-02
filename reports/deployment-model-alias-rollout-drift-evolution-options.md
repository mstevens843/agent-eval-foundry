# deployment-model-alias-rollout-drift evolution options

These are conditional descendants for the mixed provider-delta state. They are not built
families and they are not trial evidence.

## Decision

| item | value |
|---|---|
| parent family | `deployment-model-alias-rollout-drift` |
| provider-delta route | `run_non_openai_smoke` |
| selected proposal | none |

No evolution is selected yet because the current provider-delta diagnosis does not route to family evolution.

## Selected Executable Probe Evidence

No selected evolution proposal is on record.

## Proposals

### `provider-failover-router-alias-drift-probe` (selected)

| field | value |
|---|---|
| start as | `mechanism_probe` |
| operators | `add_provider_failover`, `add_router_fallback_drift`, `add_delayed_authoritative_receipts` |
| truth source | router receipt ledger plus rollout ledger plus concrete eval stream |
| cheapest next evidence | build an executable mechanism probe with 5-8 router/failover scenarios |
| confirm signal | A one-agent smoke failure lands on router receipt reconciliation, provider failover attribution, or truthful route/eval audit checks. |
| kill signal | A strong subject solves the probe cleanly by applying the current deployment-alias rules without new failure, or failures are off-target/spec ambiguity. |

**What stays fixed:**

- alias name is not model identity
- current routing truth comes from an authoritative ledger
- eval results must be attributed to concrete served versions
- subject-owned model reports are claims, not truth

**What changes:**

- the alias can route to different providers during failover
- the model router and rollout ledger can briefly disagree
- receipts arrive after the subject has a tempting cached route
- rollback may need to target a provider route rather than only a model version

**Why harder:**

- the truth boundary moves outside the local alias map
- the subject must reconcile router receipts with rollout/eval ledgers
- the valid action may be continue, quarantine, provider failback or rollback

**Expected knobs:** `failoverTiming`, `routerReceiptDelay`, `fallbackProvider`, `ledgerDisagreement`, `evalProviderMix`, `rollbackTargetKind`, `cachedRouteStaleness`

**Expected mutants:** `cached-router-truster`, `provider-name-only-decider`, `receipt-blind-rollbacker`, `always-failback`, `never-failback`, `audit-router-liar`

**Risks:**

- public spec must define when router receipts outrank cached alias maps
- hidden cases may sample timing, but must not add secret precedence rules
- verifier must own router/effect ledgers and not trust subject summaries
- provider failback effects need idempotency checks
- subject may forge router receipts
- subject may substitute provider labels without preserving concrete served versions

### `incident-audit-ledger-contradiction-probe`

| field | value |
|---|---|
| start as | `mechanism_probe` |
| operators | `add_incident_ledger_contradiction`, `add_audit_truth_requirement`, `add_authoritative_reconciliation` |
| truth source | deployment ledger plus incident ledger plus final effect receipt |
| cheapest next evidence | build a tiny contradiction probe with two source ledgers and one final receipt |
| confirm signal | Smoke failure lands on audit-source contradiction or status-only decision checks. |
| kill signal | Probe solves reduce to already-solved deployment-alias logic with no added diagnosis value. |

**What stays fixed:**

- deployment action must follow authoritative rollout/eval evidence
- subject-written audit is not truth
- incorrect rollout continuation remains forbidden

**What changes:**

- incident ledger and deployment ledger can disagree temporarily
- the correct action may require preserving the contradiction instead of resolving it away
- audit truth becomes a first-class success condition

**Why harder:**

- the subject must avoid flattening contradictory sources into a convenient status
- a pass requires transparent uncertainty, not just the final action

**Expected knobs:** `incidentLedgerDelay`, `contradictionKind`, `evidencePrecedence`, `auditVisibility`, `operatorOverride`, `finalReceiptTiming`

**Expected mutants:** `status-only-decider`, `incident-ledger-ignorer`, `audit-rewriter`, `operator-override-truster`

**Risks:**

- the spec must publish source precedence and allowed uncertainty states
- hidden scenarios must sample contradictions without adding hidden rules
- audit-grading must distinguish truthful uncertainty from no-op refusal
- verifier must preserve source-specific facts
- subject may rewrite the audit after final receipt
- subject may output only final status and hide the contradiction

### `multi-region-alias-propagation-delay-probe`

| field | value |
|---|---|
| start as | `mechanism_probe` |
| operators | `add_multi_region_state`, `add_time_separation`, `add_partial_observability` |
| truth source | per-region alias propagation ledger plus regional eval stream |
| cheapest next evidence | run a mechanism probe before any full family build |
| confirm signal | Smoke failure concentrates on region/propagation knobs while reference and mutants remain cleanly separated. |
| kill signal | Probe failures collapse to the same local alias comparison already solved by Claude. |

**What stays fixed:**

- alias names remain labels, not concrete model identity
- rollback/continue decisions must use authoritative ledgers
- audit must preserve the facts observed at decision time

**What changes:**

- current alias mapping differs by region during propagation
- eval samples come from region-specific served versions
- a rollback in one region can be invalid in another

**Why harder:**

- there is no single global current alias until propagation settles
- the subject must reconcile region, time and served-version evidence

**Expected knobs:** `region`, `propagationLag`, `regionalAliasState`, `regionalEvalMix`, `rollbackScope`, `settleWindow`

**Expected mutants:** `global-alias-truster`, `region-blind-rollbacker`, `settle-window-skipper`, `all-region-overblocker`

**Risks:**

- region precedence and propagation windows must be public
- examples must show a valid regional continue case
- region-specific effects must not collapse into one global ledger
- settling windows must be deterministic
- subject may claim all regions share one route
- subject may forge a global receipt from one region's ledger

### `prompt-template-alias-drift-probe`

| field | value |
|---|---|
| start as | `mechanism_probe` |
| operators | `add_prompt_template_alias`, `add_baseline_alias_drift`, `add_eval_source_dependency` |
| truth source | prompt-template rollout ledger plus model rollout ledger plus eval stream |
| cheapest next evidence | paper screen plus mechanism probe; do not jump to full family |
| confirm signal | Probe catches subjects that attribute every regression to the model alias alone. |
| kill signal | Probe behaves like wording-only variation of deployment-alias and adds no new axis. |

**What stays fixed:**

- alias labels are not concrete deployed artifacts
- eval attribution and baseline comparison must use authoritative artifact ids

**What changes:**

- the drifting artifact is a prompt template alias rather than a model version alias
- model version and prompt version jointly determine eval comparability
- baseline may be stale for one artifact while current for the other

**Why harder:**

- a correct subject must avoid blaming model drift for prompt-template drift
- there are two interacting alias layers instead of one

**Expected knobs:** `promptAliasState`, `modelAliasState`, `baselineArtifactKind`, `evalAttributionCompleteness`, `templateRolloutPhase`

**Expected mutants:** `model-only-attributor`, `prompt-alias-truster`, `baseline-artifact-collapser`, `template-audit-liar`

**Risks:**

- public rules must explain joint comparability of model and prompt artifacts
- examples should show model-current but prompt-stale cases
- expected decision must not depend on hidden product semantics
- artifact ids must be harness-owned
- subject may relabel prompt ids to match the preferred baseline
- subject may omit one alias layer from audit

## Proposal Findings

No proposal validation findings.

## Evidence Boundary

- Evolution proposals are routing artifacts, not measured families.
- The selected proposal starts as a mechanism probe.
- No full descendant should be built until the probe survives cheap validation.
- No model trial was run to produce this report.

---

Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.
