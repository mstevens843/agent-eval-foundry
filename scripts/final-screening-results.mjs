// Portable accounting only. Reading published evidence never dispatches a model.
import assert from "node:assert/strict";

export function buildFinalResults(original, ledger, continuation) {
  const names = {
    "route-policy-repair": [14, "Route policy"],
    "browser-replay-repair": [3, "Browser replay"],
    "recurring-calendar-repair": [18, "Recurring calendar"],
    "workflow-authority-repair": [20, "Workflow authority"],
    "delegated-budget-repair": [4, "Delegated budget"],
  };
  const current = ledger.packages.map((prior) => {
    const completed = continuation.packages[prior.id];
    assert(completed, `missing final campaign: ${prior.id}`);
    const history = prior.history.map((r) => ({
      trial: r.historicalTrial, provider: r.provider,
      recordedReward: r.originalReward, countedReward: r.countedReward,
      disposition: r.disposition, packageDigest: r.packageDigest,
      completionSha256: r.completionSha256,
    })).concat(completed.trials.map((r) => ({
      trial: r.historicalTrial, provider: r.target,
      recordedReward: r.reward, countedReward: r.reward,
      disposition: "retained", packageDigest: r.packageDigest,
      completionSha256: r.completionSha256,
    })));
    assert.equal(new Set(history.map((r) => r.trial)).size, history.length, "duplicate trial");
    for (const row of history) {
      assert([0, 1, null].includes(row.countedReward));
      assert(["codex", "claude"].includes(row.provider));
      if (["grading-void", "infrastructure-interrupted"].includes(row.disposition))
        assert.equal(row.countedReward, null, "excluded attempt must remain uncounted");
    }
    const countedAttempts = history.filter((r) => r.countedReward !== null);
    const failures = countedAttempts.filter((r) => r.countedReward === 0).length;
    const scored = countedAttempts.length;
    const attemptsByProvider = Object.fromEntries(["codex", "claude"].map((p) =>
      [p, countedAttempts.filter((r) => r.provider === p).length]));
    assert(scored <= 6 && Object.values(attemptsByProvider).every((n) => n <= 3));
    assert.deepEqual({ failures, scored, providers: attemptsByProvider }, {
      failures: completed.finalTally.failures, scored: completed.finalTally.scored,
      providers: completed.finalTally.providers,
    });
    const [number, name] = names[prior.id];
    return { id: prior.id, number, name, analysis: prior.analysis, failures, scored,
      attemptsByProvider, countedAttempts,
      excludedAttempts: history.filter((r) => r.countedReward === null),
      stopReason: completed.finalTally.stopReason };
  });
  const qualifies = (p) => p.scored === 6 && p.failures >= 5 &&
    p.attemptsByProvider.codex === 3 && p.attemptsByProvider.claude === 3;
  const packages = [...original.packages, ...current.filter(qualifies)];
  assert.equal(new Set(packages.map((p) => p.id)).size, packages.length, "duplicate finalist");
  assert(packages.every(qualifies));
  for (const p of packages) {
    assert.equal(p.countedAttempts.length, p.scored);
    assert.equal(p.countedAttempts.filter((a) => a.countedReward === 0).length, p.failures);
    assert(p.countedAttempts.every((a) => a.countedReward === 0 || a.countedReward === 1));
    assert.equal(new Set(p.countedAttempts.map((a) => a.trial)).size, p.scored);
    for (const provider of ["codex", "claude"])
      assert.equal(p.countedAttempts.filter((a) => a.provider === provider).length, 3);
  }
  const allNew = Object.values(continuation.packages).flatMap((p) => p.trials);
  const adopted = allNew.filter((r) => r.adoptedFromRound5).length;
  const launched = allNew.length - adopted;
  assert.equal(adopted, continuation.continuation.adoptedRound5Attempts);
  assert.equal(launched, continuation.continuation.newSlotLaunches);
  assert(launched <= continuation.continuation.maxNewProviderCalls);
  const summary = {
    packages: packages.length,
    sixOfSix: packages.filter((p) => p.failures === 6).length,
    fiveOfSix: packages.filter((p) => p.failures === 5).length,
    countedTrials: packages.reduce((n, p) => n + p.scored, 0),
    zeroRewards: packages.reduce((n, p) => n + p.failures, 0),
    oneRewards: packages.reduce((n, p) => n + p.scored - p.failures, 0),
    codexTrials: packages.reduce((n, p) => n + p.attemptsByProvider.codex, 0),
    claudeTrials: packages.reduce((n, p) => n + p.attemptsByProvider.claude, 0),
    newlyQualifiedPackages: current.filter(qualifies).length,
    pendingFinalistTrials: 0,
  };
  return {
    summary, packages,
    stoppedPackages: current.filter((p) => !qualifies(p)).map((p) => ({
      ...p, maximumFailuresInSix: p.failures + 6 - p.scored,
    })),
    latestCampaign: {
      roundFiveAttempts: adopted, continuationAuthorizedSlots: continuation.continuation.maxNewProviderCalls,
      continuationAttempts: launched, totalAttempts: allNew.length,
      zeroRewards: allNew.filter((r) => r.reward === 0).length,
      oneRewards: allNew.filter((r) => r.reward === 1).length,
      infrastructureInterruptions: allNew.filter((r) => r.reward === null).length,
      unusedAuthorizedSlots: continuation.continuation.maxNewProviderCalls - launched,
    },
  };
}
