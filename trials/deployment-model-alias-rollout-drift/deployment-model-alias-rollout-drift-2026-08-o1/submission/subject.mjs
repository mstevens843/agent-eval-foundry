const completedIdempotencyKeys = new Set();

const DECISIONLESS_DUPLICATE_DETAIL =
  "idempotency key already completed; no rollout effect issued";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function auditEvent(seq, actionId, reason, currentAlias, baseline, evals, detail) {
  return {
    seq,
    actionId,
    reason,
    observedAlias: currentAlias?.alias ?? null,
    observedCurrentVersion: currentAlias?.version ?? null,
    observedGeneration: currentAlias?.generation ?? null,
    observedPhase: currentAlias?.phase ?? null,
    observedCanaryWindow: currentAlias?.canaryWindow ?? null,
    observedBaselineVersion: baseline?.version ?? null,
    observedEvalSampleIds: evals.map((sample) => sample.sampleId),
    observedEvalServedVersions: evals.map((sample) => sample.servedVersion),
    usedSubjectModelClaim: false,
    detail,
  };
}

function chooseNonPromotingDecision(view) {
  return view.request.reevaluationAvailable ? "re_evaluate" : "quarantine";
}

function latestMatchingRolloutEntry(rolloutLedger, currentAlias) {
  if (currentAlias === null) {
    return null;
  }

  let latest = null;
  for (const entry of rolloutLedger) {
    if (
      entry.alias === currentAlias.alias &&
      entry.version === currentAlias.version &&
      entry.generation === currentAlias.generation &&
      (latest === null || entry.seq > latest.seq)
    ) {
      latest = entry;
    }
  }

  return latest;
}

function rolloutWindowState(currentAlias, rolloutLedger) {
  if (currentAlias === null) {
    return { phase: null, canaryWindow: null, hasLedgerEvidence: false };
  }

  const ledgerEntry = latestMatchingRolloutEntry(rolloutLedger, currentAlias);
  return {
    phase: currentAlias.phase,
    canaryWindow: currentAlias.canaryWindow,
    hasLedgerEvidence: rolloutLedger.length === 0 || ledgerEntry !== null,
  };
}

function decide(view, currentAlias, rolloutLedger, evals, baseline) {
  const requestedBaselineVersion = view.request.requiredBaselineVersion;

  if (currentAlias === null || currentAlias.alias !== view.request.alias) {
    return {
      decision: "quarantine",
      reason: "DMD1_CURRENT_ALIAS_REQUIRED",
      concreteVersion: null,
      baselineVersion: baseline?.version ?? null,
    };
  }

  if (baseline === null || baseline.version !== requestedBaselineVersion) {
    return {
      decision: "quarantine",
      reason: "DMD3_BASELINE_MATCH_REQUIRED",
      concreteVersion: currentAlias.version,
      baselineVersion: baseline?.version ?? null,
    };
  }

  const windowState = rolloutWindowState(currentAlias, rolloutLedger);
  const windowAllowsDecision =
    windowState.phase !== "pre_canary" &&
    (windowState.canaryWindow === "open" || windowState.canaryWindow === "complete");

  if (!windowState.hasLedgerEvidence || !windowAllowsDecision) {
    return {
      decision: chooseNonPromotingDecision(view),
      reason: "DMD4_ROLLOUT_WINDOW_REQUIRED",
      concreteVersion: currentAlias.version,
      baselineVersion: baseline.version,
    };
  }

  const aliasWindowSamples = evals.filter(
    (sample) => sample.alias === view.request.alias && sample.inRolloutWindow,
  );
  const currentWindowSamples = aliasWindowSamples.filter(
    (sample) => sample.servedVersion === currentAlias.version,
  );
  const requiredSampleCount = isFiniteNumber(baseline.sampleCount)
    ? Math.max(1, baseline.sampleCount)
    : 1;
  const hasUnknownCurrentScore = currentWindowSamples.some(
    (sample) => !isFiniteNumber(sample.scoreDelta),
  );

  if (currentWindowSamples.length === 0 && aliasWindowSamples.length > 0) {
    return {
      decision: chooseNonPromotingDecision(view),
      reason: "DMD2_CONCRETE_VERSION_ATTRIBUTED",
      concreteVersion: currentAlias.version,
      baselineVersion: baseline.version,
    };
  }

  if (
    currentWindowSamples.length < requiredSampleCount ||
    hasUnknownCurrentScore
  ) {
    return {
      decision: chooseNonPromotingDecision(view),
      reason: "DMD7_QUARANTINE_OR_REEVALUATE_REQUIRED",
      concreteVersion: currentAlias.version,
      baselineVersion: baseline.version,
    };
  }

  const worstScoreDelta = Math.max(
    ...currentWindowSamples.map((sample) => sample.scoreDelta),
  );

  if (worstScoreDelta >= baseline.rollbackThreshold) {
    return {
      decision: "rollback",
      reason: "DMD5_ROLLBACK_REQUIRED",
      concreteVersion: currentAlias.version,
      baselineVersion: baseline.version,
    };
  }

  return {
    decision: "continue",
    reason: "ALLOWED",
    concreteVersion: currentAlias.version,
    baselineVersion: baseline.version,
  };
}

export const subject = {
  id: "deployment-alias-rollout-reconciler",
  label: "Deployment alias rollout reconciler",

  run(view, deployment) {
    const actionId = view.request.id;
    const idempotencyKey = view.request.idempotencyKey;
    const currentAlias = deployment.currentAlias(view.request.alias);
    const rolloutLedger = asArray(deployment.rolloutLedger(view.request.alias));
    const evals = asArray(deployment.evalStream(view.request.alias));
    const baseline = deployment.baseline(view.request.requiredBaselineVersion);
    const audit = [
      auditEvent(
        1,
        actionId,
        "OBSERVED",
        currentAlias,
        baseline,
        evals,
        "observed authoritative rollout state",
      ),
    ];

    const decision = decide(view, currentAlias, rolloutLedger, evals, baseline);

    if (completedIdempotencyKeys.has(idempotencyKey) || view.attempt > 1) {
      audit[0] = {
        ...audit[0],
        detail: DECISIONLESS_DUPLICATE_DETAIL,
      };
      completedIdempotencyKeys.add(idempotencyKey);
      return { decisions: [], audit };
    }

    const effect = {
      alias: view.request.alias,
      decision: decision.decision,
      concreteVersion: decision.concreteVersion,
      baselineVersion: decision.baselineVersion,
      idempotencyKey,
    };
    const applied = deployment.applyRolloutDecision(actionId, effect);

    if (!applied?.ok) {
      audit[0] = {
        ...audit[0],
        detail: "rollout decision effect was not recorded by deployment facade",
      };
      return { decisions: [], audit };
    }

    completedIdempotencyKeys.add(idempotencyKey);
    audit.push(
      auditEvent(
        2,
        actionId,
        decision.reason,
        currentAlias,
        baseline,
        evals,
        "decision effect recorded",
      ),
    );

    return {
      decisions: [{ actionId, alias: view.request.alias, ...decision }],
      audit,
    };
  },
};
