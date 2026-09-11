// Portable arithmetic over published records; no execution or provider access.
import assert from 'node:assert/strict';

export function buildSuccessorResults(previous, campaign) {
  const hash = /^[a-f0-9]{64}$/;
  assert.equal(campaign.packages.length, 5);
  assert.equal(new Set(campaign.packages.map(p => p.id)).size, 5);
  const current = campaign.packages.map(p => {
    const history = p.attempts;
    assert.equal(new Set(history.map(a => a.trial)).size, history.length, 'duplicate physical attempt');
    let passed = false;
    for (let i = 0; i < history.length; i++) {
      const a = history[i];
      assert.equal(a.trial, i + 1, 'physical attempt sequence');
      assert.equal(a.provider, a.trial <= 3 ? 'claude' : 'codex', 'provider substitution');
      for (const key of ['packageDigest', 'profileDigest', 'completionSha256', 'gradeSha256', 'resultSha256', 'submissionCheckerSha256'])
        assert.match(a[key], hash);
      assert(a.manifestFilesVerified > 0 && a.manifestBytesVerified > 0);
      assert([0, 1, null].includes(a.countedReward));
      if (a.disposition === 'false-pass') {
        assert.equal(a.recordedReward, 1);
        assert.equal(a.countedReward, null, 'false pass must remain null');
        assert.equal(a.audit.auditedReward, null);
        assert.match(a.audit.sha256, hash);
      } else if (a.disposition === 'grading-recovered') {
        assert.equal(a.recordedReward, null, 'original incident must remain unscored');
        assert.equal(a.recovery.originalCompletionDigest, a.completionSha256, 'regrade binding');
        assert.equal(a.recovery.packageDigest, a.packageDigest, 'regrade package binding');
        assert.equal(a.recovery.newAgentAttempts, 0, 'regrade is not a new attempt');
        assert.equal(a.countedReward, a.recovery.reward);
      } else {
        assert.equal(a.countedReward, a.recordedReward);
      }
      if (a.countedReward !== null) {
        assert(a.service.complete && a.captureCompleted && a.checkerRequired);
        assert.equal(a.countedReward, a.service.outcome === 'semantic-pass' && a.checkerPassed ? 1 : 0);
        if (passed) assert(a.authorizedConfirmation, 'unapproved attempt after a pass');
        if (a.countedReward === 1) passed = true;
      }
    }
    const countedAttempts = history.filter(a => a.countedReward !== null);
    const failures = countedAttempts.filter(a => a.countedReward === 0).length;
    const attemptsByProvider = Object.fromEntries(['codex', 'claude'].map(provider =>
      [provider, countedAttempts.filter(a => a.provider === provider).length]));
    assert(countedAttempts.length <= 6 && Object.values(attemptsByProvider).every(n => n <= 3), 'counted allocation exceeded');
    const qualifies = countedAttempts.length === 6 && failures >= 5 && Object.values(attemptsByProvider).every(n => n === 3);
    if (qualifies) assert.equal(new Set(countedAttempts.map(a => a.packageDigest)).size, 1, 'new qualifying set mixes package versions');
    return { id: p.id, number: p.number, name: p.name, analysis: p.analysis,
      failures, scored: countedAttempts.length, attemptsByProvider, countedAttempts,
      excludedAttempts: history.filter(a => a.countedReward === null),
      qualifies, stopReason: passed ? 'solver-pass' : qualifies ? 'six-clean-failures' : 'correction-ready',
      remainingCountedTrials: passed || qualifies ? 0 : 6 - countedAttempts.length };
  });
  assert.equal(current.reduce((n, p) => n + p.countedAttempts.length + p.excludedAttempts.length, 0), campaign.physicalProviderAttempts);
  const packages = [...previous.packages, ...current.filter(p => p.qualifies)].sort((a, b) => a.number - b.number);
  assert.equal(new Set(packages.map(p => p.id)).size, packages.length, 'duplicate qualifying task');
  for (const p of packages) {
    assert.equal(p.scored, 6);
    assert(p.failures >= 5);
    assert.equal(p.countedAttempts.length, 6);
    assert.equal(p.countedAttempts.filter(a => a.countedReward === 0).length, p.failures);
    assert.equal(new Set(p.countedAttempts.map(a => a.trial)).size, 6);
    for (const provider of ['claude', 'codex']) {
      assert.equal(p.attemptsByProvider[provider], 3);
      assert.equal(p.countedAttempts.filter(a => a.provider === provider).length, 3);
    }
  }
  return {
    summary: {
      packages: packages.length, sixOfSix: packages.filter(p => p.failures === 6).length,
      fiveOfSix: packages.filter(p => p.failures === 5).length,
      countedTrials: packages.reduce((n, p) => n + p.scored, 0),
      zeroRewards: packages.reduce((n, p) => n + p.failures, 0),
      oneRewards: packages.reduce((n, p) => n + p.scored - p.failures, 0),
      codexTrials: packages.reduce((n, p) => n + p.attemptsByProvider.codex, 0),
      claudeTrials: packages.reduce((n, p) => n + p.attemptsByProvider.claude, 0),
      newlyQualifiedPackages: current.filter(p => p.qualifies).length, pendingFinalistTrials: 0,
    },
    packages, otherSuccessorPackages: current.filter(p => !p.qualifies),
    campaignSummary: {
      physicalProviderAttempts: campaign.physicalProviderAttempts,
      countedOutcomes: current.reduce((n, p) => n + p.scored, 0),
      countedZeroRewards: current.reduce((n, p) => n + p.failures, 0),
      countedOneRewards: current.reduce((n, p) => n + p.scored - p.failures, 0),
      nullAttempts: current.reduce((n, p) => n + p.excludedAttempts.length, 0),
      recoveredGradingIncidents: campaign.packages.flatMap(p => p.attempts).filter(a => a.disposition === 'grading-recovered').length,
    },
  };
}
