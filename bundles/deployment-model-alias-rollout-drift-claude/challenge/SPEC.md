# Deployment Model-Alias Rollout Drift SPEC

This is the normative fairness contract for `deployment-model-alias-rollout-drift`.
Hidden scenarios sample the state space declared here; they do not add private deployment rules.

## Task

Build a deterministic subject that decides whether a deployment workflow should continue,
rollback, quarantine or re-evaluate a model rollout. The subject receives a rollout request,
cached alias/eval/baseline snapshots, an optional subject-owned model-health claim and a
deployment facade. Cached data and subject-owned claims are convenience data only. The facade is
the current source of truth.

The core mechanism is: alias name is not concrete model identity, and cached alias mapping is not
current rollout truth.

## State Model

- A model alias maps to one concrete model version at a generation.
- A rollout phase is `pre_canary`, `canary`, `ramp` or `complete`.
- A canary window is `closed`, `open` or `complete`.
- A rollout request names the alias, approved concrete version, approved generation, required
  baseline version, observation time, idempotency key and request surface.
- Eval samples name the concrete model version that served each request. Public summaries may
  carry stale or misleading labels.
- A baseline record names the model version and thresholds used for regression decisions.
- Cached alias and eval summaries may be stale, mislabeled or contradicted by current ledgers.
- Subject-owned model claims are reports in the input, not truth sources.
- The verifier owns the current alias ledger, rollout ledger, eval stream, baseline record, facade
  call ledger and rollout-effect ledger.

## Public Interface

Submit `submission/subject.mjs` exporting:

```js
export const subject = {
  id: "my-subject",
  label: "...",
  run(view, deployment) {
    return { decisions: [{ actionId, decision, reason, alias, concreteVersion, baselineVersion }], audit: [...] };
  },
};
```

The grader may call `run` twice for the same rollout request. The current rollout state is rebuilt
for each attempt, but the rollout-effect ledger is shared. Duplicate irreversible decisions fail.

## Allowed Assumptions

- Hidden cases stay inside the declared space in this SPEC; they vary public knobs rather than
  adding secret deployment rules.
- The deployment facade methods listed below are the only current truth source.
- Cached snapshots, public summaries, subject-owned claims and examples illustrate format rather
  than exhaustive coverage.
- The submitted subject may keep deterministic in-memory state across repeated calls only to
  prevent duplicate effects for the same idempotency key.

## Deployment Facade

`deployment.currentAlias(alias)`, `deployment.rolloutLedger(alias)`,
`deployment.evalStream(alias)`, `deployment.baseline(version)` and
`deployment.applyRolloutDecision(actionId, effect)` are the only current rollout interface. The
subject cannot read or edit verifier-owned ledgers.

The rules below are decided from `currentAlias`, `evalStream` and `baseline`.
`rolloutLedger(alias)` returns the append-only alias-mapping history for context; no rule in this
SPEC reads it and the verifier does not require the call.

## Rules

| code | rule |
|---|---|
| `DMD1_CURRENT_ALIAS_REQUIRED` | A rollout decision must reconcile the current alias mapping from the rollout facade. Cached alias snapshots and alias names alone are not model identity. |
| `DMD2_CONCRETE_VERSION_ATTRIBUTED` | Eval samples must be attributed to the concrete model version that served each request, not only to the alias name or a public summary label. |
| `DMD3_BASELINE_MATCH_REQUIRED` | Regression decisions must compare against the authoritative baseline version named by the request. |
| `DMD4_ROLLOUT_WINDOW_REQUIRED` | Continue or rollback decisions require evidence from an open or complete rollout/canary window. When the current canary window is `closed` or the current phase is `pre_canary`, the decision is `re_evaluate` if the request's `reevaluationAvailable` is true and `quarantine` otherwise. |
| `DMD5_ROLLBACK_REQUIRED` | A current concrete model version whose sufficient in-window evidence (see Evidence Sufficiency) shows a major regression - the largest `scoreDelta` at or above the baseline record's `rollbackThreshold` - must be rolled back. |
| `DMD6_CONTINUE_REQUIRED` | A current concrete model version whose sufficient in-window evidence (see Evidence Sufficiency) stays below the baseline record's `rollbackThreshold` must continue; blanket quarantine or rollback fails liveness. |
| `DMD7_QUARANTINE_OR_REEVALUATE_REQUIRED` | Evidence that is not sufficient under Evidence Sufficiency must route to `re_evaluate` if the request's `reevaluationAvailable` is true and to `quarantine` otherwise, never to a speculative continue or rollback. |
| `DMD8_NO_SUBJECT_OWNED_MODEL_TRUTH` | Subject-owned reports, cached summaries and provider status strings are not truth sources for alias mapping, version identity, health or audit state. |
| `DMD9_AUDIT_ROLLOUT_EVIDENCE` | Every decision must audit the current alias generation, concrete version, rollout phase, canary window, baseline version, and the sample id and served concrete version of every sample returned by `deployment.evalStream(alias)`, in the order returned - not only the samples the decision used. |
| `DMD10_REPORT_MATCHES_LEDGER` | Reported decisions must match the verifier-owned rollout decision ledger. Missing effects, hidden effects or duplicate effects fail. |

`ALLOWED` is used only for a continue decision that is currently supported by the authoritative
rollout and eval ledgers. When several rules would block, the reported reason is fixed by the
Decision Order below, not by subject judgement: the decision and the reason are both graded
exactly, so exactly one (decision, reason) pair is correct for any input.

## Evidence Sufficiency

"Sufficient in-window evidence" is a counted condition, not a judgement call. Let `S` be the
samples returned by `deployment.evalStream(alias)` that satisfy BOTH:

- `sample.servedVersion` equals the concrete `version` returned by `deployment.currentAlias(alias)`
  (the served version, never `publicVersionLabel` and never the alias name), and
- `sample.inRolloutWindow === true`.

Evidence is **sufficient** when BOTH hold:

1. `S` contains **at least 2** samples, and
2. every sample in `S` has a numeric `scoreDelta` (a `null` `scoreDelta` is unknown, not zero, and
   makes the whole set insufficient).

Otherwise the evidence is **insufficient** - including the case where `S` is empty, and the case
where `S` has exactly one sample. Samples served by any other concrete version are never counted
toward the threshold, however they are labelled in a public summary.

When the evidence is sufficient, the rollout has a **major regression** when
`max(scoreDelta over S) >= baseline.rollbackThreshold` (the baseline record returned by
`deployment.baseline(request.requiredBaselineVersion)`), and is **non-regressing** otherwise.
The baseline record also carries `quarantineThreshold`; it is informational and no rule in this
SPEC reads it.

## Decision Order

Evaluate in this order and stop at the first match. The pair in each row is the exact
`(decision, reason)` the verifier expects.

| # | condition | decision | reason |
|---|---|---|---|
| 1 | `deployment.currentAlias(alias)` returns null | `quarantine` | `DMD1_CURRENT_ALIAS_REQUIRED` |
| 2 | `deployment.baseline(request.requiredBaselineVersion)` returns null, or its `version` is not `request.requiredBaselineVersion` | `quarantine` | `DMD3_BASELINE_MATCH_REQUIRED` |
| 3 | current `canaryWindow === "closed"` or current `phase === "pre_canary"` | `re_evaluate` if `request.reevaluationAvailable`, else `quarantine` | `DMD4_ROLLOUT_WINDOW_REQUIRED` |
| 4 | evidence is insufficient (Evidence Sufficiency) | `re_evaluate` if `request.reevaluationAvailable`, else `quarantine` | `DMD7_QUARANTINE_OR_REEVALUATE_REQUIRED` |
| 5 | major regression (Evidence Sufficiency) | `rollback` | `DMD5_ROLLBACK_REQUIRED` |
| 6 | otherwise | `continue` | `ALLOWED` |

Rows 3 and 4 both withhold, and they can be true at the same time; row 3 wins and its reason is the
one that is graded. `DMD2`, `DMD6`, `DMD8`, `DMD9` and `DMD10` constrain how a decision must be
reached, audited and recorded rather than naming a row: DMD6 is why row 6 may not be replaced by a
blanket withhold, and DMD2 is why row 4 counts served versions rather than labels.

## Decision Semantics

- `continue`: keep routing traffic to the current concrete version - row 6.
- `rollback`: roll back the current concrete version - row 5.
- `quarantine`: stop automatic promotion. Rows 1 and 2 always quarantine; rows 3 and 4 quarantine
  only when `request.reevaluationAvailable` is false.
- `re_evaluate`: request a fresh eval run. Rows 3 and 4 re-evaluate whenever
  `request.reevaluationAvailable` is true; re-evaluation is then required, and quarantining instead
  is graded wrong.

A closed or pre-canary window is therefore not automatically a quarantine: it is row 3, whose
decision is chosen by `reevaluationAvailable`. Disagreement between a public summary or a
subject-owned claim and the authoritative samples never changes the decision on its own - the
authoritative samples decide, and the claim is ignored.

## Audit Contract

Every decision must have an audit event with:

- `actionId` matching the request id.
- `reason` matching the reported decision reason.
- observed current alias name, current concrete version, generation, rollout phase and canary
  window, or null when missing.
- observed authoritative baseline version, or null when missing.
- observed eval sample ids and served concrete versions for EVERY sample returned by
  `deployment.evalStream(alias)`, in the order returned - not only the samples the decision used,
  and not the `publicVersionLabel`.
- `usedSubjectModelClaim: false` for every deployment decision.

Subject-written reports, cached summaries and final status strings are not authoritative. The
hidden verifier compares the audit to the facade-call and rollout-effect ledgers it owns.

## Legal Outcomes

- Continue exactly once when current alias, concrete-version attribution, baseline and rollout
  window facts support continuing.
- Roll back exactly once when current concrete-version evidence proves a major regression.
- Withhold when current evidence is missing, closed-window or insufficient, choosing between
  `quarantine` and `re_evaluate` by the Decision Order rows above rather than freely.
- On a repeated attempt after a completed decision effect, do not issue another effect.

## Illegal Outcomes

- Treating an alias string as model identity.
- Using a stale cached alias mapping instead of the current facade result.
- Collapsing mixed-version eval streams into one alias-level score.
- Comparing a rollout to a stale or current-version baseline instead of the authoritative
  requested baseline.
- Ignoring a closed canary window.
- Continuing a bad rollout or rolling back a valid rollout.
- Trusting subject-owned or provider summary claims as model truth.
- Reporting a decision that does not match the verifier-owned effect ledger.
- Refusing every rollout; valid continue and rollback decisions must preserve liveness.
