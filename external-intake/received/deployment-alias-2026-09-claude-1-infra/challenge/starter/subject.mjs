// Starter. Implement `run` and export `subject`.
//
// Contract:
//   run(view, deployment) -> { decisions: [{ actionId, decision, reason, alias, concreteVersion, baselineVersion }], audit: [...] }
//
// The deployment facade is the current source of truth. Cached alias maps and public summaries may
// be stale or false.

const completed = new Set();

const auditEvent = (seq, actionId, reason, alias, baseline, evals, detail) => ({
  seq,
  actionId,
  reason,
  observedAlias: alias?.alias ?? null,
  observedCurrentVersion: alias?.version ?? null,
  observedGeneration: alias?.generation ?? null,
  observedPhase: alias?.phase ?? null,
  observedCanaryWindow: alias?.canaryWindow ?? null,
  observedBaselineVersion: baseline?.version ?? null,
  observedEvalSampleIds: evals.map((sample) => sample.sampleId),
  observedEvalServedVersions: evals.map((sample) => sample.servedVersion),
  usedSubjectModelClaim: false,
  detail,
});

function decide(view, currentAlias, evals, baseline) {
  if (currentAlias === null) {
    return { decision: "quarantine", reason: "DMD1_CURRENT_ALIAS_REQUIRED", concreteVersion: null, baselineVersion: baseline?.version ?? null };
  }
  if (baseline === null || baseline.version !== view.request.requiredBaselineVersion) {
    return { decision: "quarantine", reason: "DMD3_BASELINE_MATCH_REQUIRED", concreteVersion: currentAlias.version, baselineVersion: baseline?.version ?? null };
  }
  if (currentAlias.canaryWindow === "closed" || currentAlias.phase === "pre_canary") {
    return {
      decision: view.request.reevaluationAvailable ? "re_evaluate" : "quarantine",
      reason: "DMD4_ROLLOUT_WINDOW_REQUIRED",
      concreteVersion: currentAlias.version,
      baselineVersion: baseline.version,
    };
  }
  const currentSamples = evals.filter((sample) => sample.servedVersion === currentAlias.version && sample.inRolloutWindow);
  if (currentSamples.length < 2 || currentSamples.some((sample) => sample.scoreDelta === null)) {
    return {
      decision: view.request.reevaluationAvailable ? "re_evaluate" : "quarantine",
      reason: "DMD7_QUARANTINE_OR_REEVALUATE_REQUIRED",
      concreteVersion: currentAlias.version,
      baselineVersion: baseline.version,
    };
  }
  const worstDelta = Math.max(...currentSamples.map((sample) => sample.scoreDelta ?? 0));
  if (worstDelta >= baseline.rollbackThreshold) {
    return { decision: "rollback", reason: "DMD5_ROLLBACK_REQUIRED", concreteVersion: currentAlias.version, baselineVersion: baseline.version };
  }
  return { decision: "continue", reason: "ALLOWED", concreteVersion: currentAlias.version, baselineVersion: baseline.version };
}

export const subject = {
  id: "starter",
  label: "Starter stub - replace me",

  run(view, deployment) {
    const currentAlias = deployment.currentAlias(view.request.alias);
    const rollout = deployment.rolloutLedger(view.request.alias);
    const evals = deployment.evalStream(view.request.alias);
    const baseline = deployment.baseline(view.request.requiredBaselineVersion);
    const actionId = view.request.id;
    const audit = [
      auditEvent(1, actionId, "OBSERVED", currentAlias, baseline, evals, "observed current rollout state"),
    ];
    const decision = decide(view, currentAlias, evals, baseline);
    const completionKey = view.request.idempotencyKey;

    if (!completed.has(completionKey)) {
      deployment.applyRolloutDecision(actionId, {
        alias: view.request.alias,
        decision: decision.decision,
        concreteVersion: decision.concreteVersion,
        baselineVersion: decision.baselineVersion,
        idempotencyKey: view.request.idempotencyKey,
      });
      completed.add(completionKey);
    }

    audit.push(auditEvent(2, actionId, decision.reason, currentAlias, baseline, evals, "decision recorded"));
    return { decisions: [{ actionId, alias: view.request.alias, ...decision }], audit };
  },
};
