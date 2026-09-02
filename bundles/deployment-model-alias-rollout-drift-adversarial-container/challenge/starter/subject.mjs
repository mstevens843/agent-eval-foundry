// Starter. Implement the decision and export `subject`.
//
//   run(view, deployment) -> {
//     decisions: [{ actionId, decision, reason, alias, concreteVersion, baselineVersion }],
//     audit: [...],
//   }
//
// The deployment facade is the current source of truth. `view.cachedAlias`,
// `view.cachedEvalSummary`, `view.cachedBaselineVersion` and `view.subjectModelClaim` are
// convenience data: they may be stale, mislabeled, or simply false.
//
// Read SPEC.md before writing anything. "Evidence Sufficiency" defines the counted threshold,
// "Decision Order" lists the exact (decision, reason) pair for every case, and "Audit Contract"
// lists the audit fields. None of that is implemented below - the decision is yours to write.

const completed = new Set();

export const subject = {
  id: "starter",
  label: "Starter skeleton - replace me",

  run(view, deployment) {
    const actionId = view.request.id;
    const alias = view.request.alias;

    // Current truth. Decide from these, not from view.cached*.
    const currentAlias = deployment.currentAlias(alias);
    const evalStream = deployment.evalStream(alias);
    const baseline = deployment.baseline(view.request.requiredBaselineVersion);
    // deployment.rolloutLedger(alias) is also available, for context. No rule requires it.

    const audit = [];
    const record = (reason, detail) => {
      audit.push({
        seq: audit.length + 1,
        actionId,
        reason,
        // TODO: SPEC.md "Audit Contract". Every field below must cite the CURRENT facts you read
        // above, not the cached view, and the eval fields must cover the WHOLE stream in order.
        observedAlias: null,
        observedCurrentVersion: null,
        observedGeneration: null,
        observedPhase: null,
        observedCanaryWindow: null,
        observedBaselineVersion: null,
        observedEvalSampleIds: [],
        observedEvalServedVersions: [],
        usedSubjectModelClaim: false,
        detail,
      });
    };

    // TODO: apply SPEC.md "Evidence Sufficiency" and "Decision Order" to currentAlias, evalStream
    // and baseline, then replace all four placeholders. They are placeholders, not a default:
    // as written this reports the same answer for every input and is wrong nearly everywhere.
    const decision = "quarantine";
    const reason = "DMD7_QUARANTINE_OR_REEVALUATE_REQUIRED";
    const concreteVersion = null;
    const baselineVersion = null;

    record(reason, "replace this");

    // The rollout-effect ledger is shared across the attempts for one request, so the effect for a
    // given idempotency key must fire exactly once. See SPEC.md "Legal Outcomes".
    if (!completed.has(view.request.idempotencyKey)) {
      completed.add(view.request.idempotencyKey);
      deployment.applyRolloutDecision(actionId, {
        alias,
        decision,
        concreteVersion,
        baselineVersion,
        idempotencyKey: view.request.idempotencyKey,
      });
    }

    return {
      decisions: [{ actionId, alias, decision, reason, concreteVersion, baselineVersion }],
      audit,
    };
  },
};
