// Portable publication checks only: no raw transcripts, credentials, Docker or provider calls.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SCREENING_BATCHES = [
  ["original-five", "2026-09-07-original-five"],
  ["next-five", "2026-09-08-next-five"],
  ["third-five", "2026-09-08-third-five"],
  ["fourth-five", "2026-09-08-fourth-five"],
  ["fifth-five", "2026-09-08-fifth-five"],
];

// Versioned follow-ups reuse the original per-package analysis files. They are
// additional trials or engineering evidence, not additional distinct packages.
export const SCREENING_FOLLOWUPS = [
  "second-trial-priority-2026-09-09.md",
  "top-five-implementation-plan-2026-09-09.md",
  "next-five-implementation-plan-2026-09-09.md",
  "third-ranked-five-implementation-plan-2026-09-09.md",
  "fourth-ranked-five-implementation-plan-2026-09-09.md",
  "final-five-implementation-plan-2026-09-09.md",
  "round-two-top-five-2026-09-09.md",
  "round-two-portfolio-2026-09-09.md",
  "evidence/2026-09-09-second-trial-source-audit.json",
  "evidence/2026-09-09-successor-generators.json",
  "evidence/2026-09-09-top-five-integration.json",
  "evidence/2026-09-09-top-five-implementation.json",
  "evidence/2026-09-09-next-five-generators.json",
  "evidence/2026-09-09-next-five-implementation.json",
  "evidence/2026-09-09-third-ranked-five-generators.json",
  "evidence/2026-09-09-third-ranked-five-implementation.json",
  "evidence/2026-09-09-fourth-ranked-five-generators.json",
  "evidence/2026-09-09-fourth-ranked-five-implementation.json",
  "evidence/2026-09-09-final-five-generators.json",
  "evidence/2026-09-09-final-five-implementation.json",
  "evidence/2026-09-09-round-two-top-five.json",
  "evidence/2026-09-09-round-two-top-five-audit.json",
  "round-two-next-five-2026-09-09.md",
  "evidence/2026-09-09-round-two-next-five.json",
  "round-two-third-ranked-five-2026-09-09.md",
  "evidence/2026-09-09-round-two-third-ranked-five.json",
  "round-two-fourth-ranked-five-2026-09-09.md",
  "evidence/2026-09-09-round-two-fourth-ranked-five.json",
  "round-two-final-five-2026-09-09.md",
  "evidence/2026-09-09-round-two-final-five.json",
  "evidence/2026-09-09-route-policy-repair-retry.json",
  "evidence/2026-09-09-round-three-failing-five-preparation.json",
  "round-three-failing-five-2026-09-09.md",
  "evidence/2026-09-09-round-three-failing-five.json",
  "evidence/2026-09-09-round-four-failing-five-preparation.json",
  "round-four-failing-five-2026-09-09.md",
  "evidence/2026-09-09-round-four-failing-five.json",
  "evidence/2026-09-09-round-five-continuing-four-preparation.json",
  "round-five-continuing-four-2026-09-09.md",
  "evidence/2026-09-09-round-five-continuing-four.json",
  "final-six-pass-audit-2026-09-09.md",
  "evidence/2026-09-09-final-six-pass-audit.json",
  "evidence/2026-09-09-final-six-preparation.json",
  "evidence/2026-09-09-final-six-concurrency-amendment.json",
  "final-six-2026-09-09.md",
  "evidence/2026-09-09-final-six.json",
];

export function verifyPublication(root = process.cwd()) {
  const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
  const hash = /^[a-f0-9]{64}$/;
  const first = read("reports/screening/evidence/2026-09-07-original-five.json");
  const next = read("reports/screening/evidence/2026-09-08-next-five.json");
  const ids = new Set();
  let verifiedFiles = 0;
  const expected = ["README.md", ...SCREENING_FOLLOWUPS];
  let index = 0;
  let missingBatch = false;
  for (const [batchIndex, [folder, file]] of SCREENING_BATCHES.entries()) {
    const path = `reports/screening/evidence/${file}.json`;
    if (!existsSync(join(root, path))) {
      assert.ok(batchIndex >= 2, "historical evidence must remain present");
      missingBatch = true;
      continue;
    }
    assert.ok(!missingBatch, "screening publication must preserve batch order");
    const batch = read(path);
    assert.equal(batch.schemaVersion, 1);
    assert.equal(batch.evidenceClass, "real-provider-screening");
    assert.equal(batch.packages.length, 5);
    assert.ok(batch.limitations.length > 0);
    if (batchIndex >= 2) {
      assert.equal(batch.automaticRetries, 0);
      assert.equal(batch.packages.filter((p) => p.target === "codex").length, 2);
      assert.equal(batch.packages.filter((p) => p.target === "claude").length, 3);
      assert.equal(batch.concurrencyRequestFulfilled, true);
      assert.equal(batch.concurrencyObservation.count, 5);
      assert.equal(new Set(batch.concurrencyObservation.packageIds).size, 5);
      assert.deepEqual(
        [...batch.concurrencyObservation.packageIds].sort(),
        batch.packages.map((p) => p.id).sort(),
      );
      assert.match(batch.sourceDigest, hash);
    }
    expected.push(`evidence/${file}.json`);
    for (const record of batch.packages) {
      assert.match(record.id, /^[a-z0-9-]+$/);
      assert.ok(!ids.has(record.id), "duplicate screened package");
      ids.add(record.id);
      assert.ok(existsSync(join(root, "tasks", record.id)));
      for (const key of ["packageDigest", "profileDigest", "completionSha256", "resultSha256", "gradeSha256"])
        assert.match(record[key], hash, `${record.id}:${key}`);
      assert.ok(Number.isInteger(record.verifiedFiles) && record.verifiedFiles > 0);
      verifiedFiles += record.verifiedFiles;
      assert.ok(!Object.hasOwn(record, "directory"));
      assert.ok(!/\/Users\/|\.local\//.test(JSON.stringify(record)), "nonportable/private record path");
      if (record.checker?.reasonPolicy === "any-observed-public-obligation") {
        const checker = record.checker;
        assert.match(checker.gradeSummarySha256, hash);
        assert.equal(checker.details.length, checker.total);
        for (const detail of checker.details) {
          assert.ok(Array.isArray(detail.observedFailingChecks));
          if (detail.expectedFailingCheck === null) assert.equal(detail.observedFailingChecks.length, 0);
          else
            assert.ok(
              detail.observedFailingChecks.includes(detail.expectedFailingCheck),
              "negative candidate's primary control must actually activate",
            );
        }
        assert.equal(
          checker.namedRightCheck,
          checker.details.filter((d) => d.outcome === "correct-reject-named").length,
        );
        assert.equal(
          checker.pass,
          checker.deterministic &&
            checker.falsePositives === 0 &&
            checker.missed === 0 &&
            checker.namedRightCheck === checker.details.filter((d) => d.expectedFailingCheck !== null).length,
        );
      }
      expected.push(`${folder}/${String(++index).padStart(2, "0")}-${record.id}.md`);
    }
  }
  assert.equal(first.excludedAttempts.length, 3);
  assert.match(first.setupIncident, /accidental/);
  assert.equal(next.concurrencyRequestFulfilled, false);
  const partial = next.packages.find((p) => p.id === "partial-release-repair");
  assert.equal(partial.assessment, "contract-grader-alignment-concern");
  assert.equal(partial.service.failedScenarios, 0);
  assert.equal(partial.checker.correct, partial.checker.total);
  const retrials = read("reports/screening/evidence/2026-09-09-round-two-top-five.json");
  const audit = read("reports/screening/evidence/2026-09-09-round-two-top-five-audit.json");
  assert.equal(retrials.packages.length, 5);
  assert.equal(new Set(retrials.packages.map((p) => p.id)).size, 5);
  assert.equal(audit.newModelCalls, 0);
  assert.equal(audit.formalAdjudicationChanged, false);
  let retrialVerifiedFiles = 0;
  for (const record of retrials.packages) {
    assert.ok(ids.has(record.id), "retrial must extend an existing package history");
    for (const key of ["packageDigest", "profileDigest", "completionSha256", "resultSha256", "gradeSha256"])
      assert.match(record[key], hash, `${record.id}:${key}`);
    const checker = record.checker;
    assert.equal(checker.reasonPolicy, "diagnostic-only");
    assert.equal(checker.details.length, checker.total);
    assert.equal(checker.falsePositives, checker.details.filter((d) => d.outcome === "false-positive").length);
    assert.equal(checker.missed, checker.details.filter((d) => d.outcome === "missed").length);
    assert.equal(checker.correct, checker.total - checker.falsePositives - checker.missed);
    assert.equal(checker.pass, checker.deterministic && checker.falsePositives === 0 && checker.missed === 0);
    assert.equal(record.reward, record.serviceOutcome === "semantic-pass" && checker.pass ? 1 : 0);
    assert.equal(record.outcome, record.reward === 1 ? "semantic-pass" : "semantic-fail");
    assert.equal(record.recordedAdjudication, "unlabelled");
    assert.equal(record.recordedCountsAsModelFailure, false);
    assert.equal(record.recordedModelEvidenceEligible, false);
    const integrity = audit.manifestVerification.find((p) => p.id === record.id);
    assert.ok(integrity);
    assert.deepEqual(integrity.errors, []);
    assert.equal(integrity.recordedReward, record.reward);
    assert.equal(integrity.manifestFilesVerified, record.manifestFilesVerified);
    assert.ok(Number.isInteger(record.manifestFilesVerified) && record.manifestFilesVerified > 0);
    retrialVerifiedFiles += record.manifestFilesVerified;
  }
  assert.equal(retrials.audit.manifestFilesVerified, retrialVerifiedFiles);
  const successorRecords = [...retrials.packages];
  const attemptKeys = new Set(retrials.packages.map((p) => `${retrials.campaign}/${p.runId}`));
  const campaigns = [
    ...["next-five", "third-ranked-five", "fourth-ranked-five", "final-five"].map((group) =>
      read(`reports/screening/evidence/2026-09-09-round-two-${group}.json`),
    ),
    read("reports/screening/evidence/2026-09-09-route-policy-repair-retry.json"),
  ];
  for (const campaign of campaigns) {
    const records = campaign.packages ?? [campaign.package];
    const isRetry = !campaign.packages;
    assert.equal(records.length, isRetry ? 1 : 5);
    assert.equal(campaign.automaticRetries, 0);
    assert.equal(records.filter((p) => p.target === "codex").length, isRetry ? 0 : 3);
    assert.equal(records.filter((p) => p.target === "claude").length, isRetry ? 1 : 2);
    let campaignFiles = 0;
    for (const record of records) {
      const attemptKey = `${campaign.campaign}/${record.runId}`;
      assert.ok(!attemptKeys.has(attemptKey), "duplicate campaign attempt");
      attemptKeys.add(attemptKey);
      assert.ok(ids.has(record.id), "retrial must extend an existing package history");
      if (isRetry) {
        const interrupted = successorRecords.find((p) => p.id === record.id && p.reward === null);
        assert.ok(interrupted, "retry must preserve its earlier interrupted record");
        assert.equal(record.retryOfRunId, interrupted.runId);
        assert.equal(record.retryOfCampaign, "2026-09-09-round-two-next-five");
        assert.equal(record.packageDigest, interrupted.packageDigest);
        assert.equal(record.profileDigest, interrupted.profileDigest);
      }
      assert.match(record.packageDigest, hash);
      assert.match(record.profileDigest, hash);
      assert.ok(!/\/Users\/|\.local\//.test(JSON.stringify(record)), "nonportable/private record path");
      const analysis = readFileSync(join(root, record.analysis), "utf8");
      assert.ok(analysis.includes("## Trial 2"), "missing per-task Trial 2 analysis");
      if (record.reward === null) {
        assert.equal(record.assessment, "infrastructure-interrupted");
        assert.equal(record.captureStatus, "incomplete");
        for (const key of ["outcome", "service", "checker", "completionSha256", "resultSha256", "gradeSha256"])
          assert.equal(record[key], null, "interruption must not invent a grade or completed record");
        assert.match(record.partialEvidence.eventsSha256, hash);
        assert.equal(record.partialEvidence.gradePresent, false);
        assert.equal(record.partialEvidence.finalizedSubmissionPresent, false);
        continue;
      }
      for (const key of ["completionSha256", "resultSha256", "gradeSha256"])
        assert.match(record[key], hash);
      assert.equal(record.captureStatus, "completed");
      const checker = record.checker;
      if (record.id === "caa-revalidation-repair") {
        assert.equal(record.checkerRequired, false);
        assert.equal(checker, null, "native CAA has no submitted-checker deliverable");
      } else {
        assert.equal(checker.reasonPolicy, "diagnostic-only");
        assert.equal(checker.details.length, checker.total);
        assert.equal(checker.falsePositives, checker.details.filter((d) => d.outcome === "false-positive").length);
        assert.equal(checker.missed, checker.details.filter((d) => d.outcome === "missed").length);
        assert.equal(checker.correct, checker.total - checker.falsePositives - checker.missed);
        assert.equal(checker.pass, checker.deterministic && checker.falsePositives === 0 && checker.missed === 0);
      }
      assert.equal(record.reward, record.serviceOutcome === "semantic-pass" && (checker === null || checker.pass) ? 1 : 0);
      assert.equal(record.outcome, record.reward === 1 ? "semantic-pass" : "semantic-fail");
      assert.ok(Number.isInteger(record.manifestFilesVerified) && record.manifestFilesVerified > 0);
      campaignFiles += record.manifestFilesVerified;
    }
    assert.deepEqual(campaign.counts, {
      attemptsLaunched: records.length,
      completedScoredAttempts: records.filter((p) => p.reward !== null).length,
      recordedZeroRewards: records.filter((p) => p.reward === 0).length,
      solverPasses: records.filter((p) => p.reward === 1).length,
      infrastructureInterruptedAttempts: records.filter((p) => p.reward === null).length,
    });
    assert.equal(campaign.audit.manifestFilesVerified, campaignFiles);
    assert.deepEqual(campaign.audit.errors, []);
    assert.equal(campaign.audit.newModelCalls, 0);
    retrialVerifiedFiles += campaignFiles;
    successorRecords.push(...records);
  }
  const trialTwoCounts = {
    attempts: successorRecords.length,
    scored: successorRecords.filter((p) => p.reward !== null).length,
    zeroes: successorRecords.filter((p) => p.reward === 0).length,
    passes: successorRecords.filter((p) => p.reward === 1).length,
  };
  const repeat = read("reports/screening/evidence/2026-09-09-round-three-failing-five.json");
  assert.equal(repeat.packages.length, 5);
  assert.equal(new Set(repeat.packages.map((p) => p.id)).size, 5);
  assert.equal(repeat.automaticRetries, 0);
  assert.equal(repeat.invalidExecutionCount, 0);
  assert.equal(repeat.packages.filter((p) => p.target === "claude").length, 3);
  assert.equal(repeat.packages.filter((p) => p.target === "codex").length, 2);
  assert.equal(repeat.acceptanceTarget.minimumFailures, 5);
  assert.equal(repeat.acceptanceTarget.totalScoredTrials, 6);
  assert.equal(repeat.acceptanceTarget.consecutiveFailuresRequired, false);
  let repeatFiles = 0;
  let repeatBytes = 0;
  for (const record of repeat.packages) {
    const prior = successorRecords.find((p) => p.id === record.id && p.reward !== null);
    assert.ok(prior, "repeat must extend an existing scored package");
    assert.equal(prior.reward, 0);
    assert.equal(record.packageDigest, prior.packageDigest, "repeat changed the package");
    assert.equal(record.profileDigest, prior.profileDigest, "repeat changed the profile");
    assert.equal(record.target, prior.target, "repeat changed the provider");
    const attemptKey = `${repeat.campaign}/${record.runId}`;
    assert.ok(!attemptKeys.has(attemptKey), "duplicate campaign attempt");
    attemptKeys.add(attemptKey);
    assert.equal(record.captureStatus, "completed");
    assert.equal(record.service.invalidScenarios, 0);
    const checker = record.checker;
    assert.equal(checker.reasonPolicy, "diagnostic-only");
    assert.equal(checker.details.length, checker.total);
    assert.equal(checker.falsePositives, checker.details.filter((d) => d.outcome === "false-positive").length);
    assert.equal(checker.missed, checker.details.filter((d) => d.outcome === "missed").length);
    assert.equal(checker.correct, checker.total - checker.falsePositives - checker.missed);
    assert.equal(checker.pass, checker.deterministic && checker.falsePositives === 0 && checker.missed === 0);
    assert.equal(record.serviceOutcome, record.service.failedScenarios === 0 ? "semantic-pass" : "semantic-fail");
    assert.equal(record.reward, record.serviceOutcome === "semantic-pass" && checker.pass ? 1 : 0);
    assert.equal(record.outcome, record.reward === 1 ? "semantic-pass" : "semantic-fail", "overall outcome must include required checker");
    assert.equal(record.recurrence, record.reward === 0);
    assert.equal(record.progress.successorAttempts, 2);
    assert.equal(record.progress.failures, 1 + (record.reward === 0 ? 1 : 0));
    assert.equal(record.progress.solverPasses, record.reward === 1 ? 1 : 0);
    assert.equal(record.progress.consecutiveRecordedZeroes, record.reward === 0 ? 2 : 0);
    assert.equal(record.progress.failuresNeeded, 5 - record.progress.failures);
    assert.equal(record.progress.remainingAttempts, 4);
    assert.equal(record.progress.withinFiveOfSix, record.progress.failures + 4 >= 5);
    for (const provider of ["claude", "codex"]) {
      assert.equal(record.progress.attemptsByProvider[provider], record.target === provider ? 2 : 0);
      assert.equal(record.progress.remainingByProvider[provider], 3 - record.progress.attemptsByProvider[provider]);
    }
    for (const key of ["completionSha256", "resultSha256", "gradeSha256", "packageDigest", "profileDigest"])
      assert.match(record[key], hash, `${record.id}:${key}`);
    assert.ok(record.manifestFilesVerified > 0 && record.manifestBytesVerified > 0);
    assert.equal(record.totalElapsedMilliseconds, Date.parse(record.end) - Date.parse(record.start));
    assert.ok(!/\/Users\/|\.local\//.test(JSON.stringify(record)), "nonportable/private repeat record");
    assert.ok(readFileSync(join(root, record.analysis), "utf8").includes("## Trial 3"));
    repeatFiles += record.manifestFilesVerified;
    repeatBytes += record.manifestBytesVerified;
  }
  assert.equal(repeat.audit.manifestFilesVerified, repeatFiles);
  assert.equal(repeat.audit.manifestBytesVerified, repeatBytes);
  assert.equal(repeat.audit.newModelCalls, 0);
  assert.deepEqual(repeat.audit.errors, []);
  successorRecords.push(...repeat.packages);
  retrialVerifiedFiles += repeatFiles;
  const round4 = read("reports/screening/evidence/2026-09-09-round-four-failing-five.json");
  assert.equal(round4.packages.length, 5);
  assert.equal(new Set(round4.packages.map((p) => p.id)).size, 5);
  assert.equal(round4.automaticRetries, 0);
  assert.equal(round4.invalidExecutionCount, 0);
  assert.equal(round4.packages.filter((p) => p.target === "claude").length, 3);
  assert.equal(round4.packages.filter((p) => p.target === "codex").length, 2);
  assert.equal(round4.acceptanceTarget.minimumFailures, 5);
  assert.equal(round4.acceptanceTarget.totalScoredTrials, 6);
  assert.equal(round4.acceptanceTarget.consecutiveFailuresRequired, false);
  let round4Files = 0;
  let round4Bytes = 0;
  for (const record of round4.packages) {
    const priorTrial3 = repeat.packages.find((p) => p.id === record.id);
    assert.ok(priorTrial3, "Trial 4 must extend an existing Trial 3 record");
    assert.equal(record.trial2Reward, priorTrial3.trial2Reward);
    assert.equal(record.trial3Reward, priorTrial3.reward);
    assert.equal(record.packageDigest, priorTrial3.packageDigest, "Trial 4 changed the package");
    assert.equal(record.profileDigest, priorTrial3.profileDigest, "Trial 4 changed the profile");
    assert.equal(record.target, priorTrial3.target, "Trial 4 changed the provider");
    const attemptKey = `${round4.campaign}/${record.runId}`;
    assert.ok(!attemptKeys.has(attemptKey), "duplicate campaign attempt");
    attemptKeys.add(attemptKey);
    assert.equal(record.captureStatus, "completed");
    assert.equal(record.service.invalidScenarios, 0);
    const checker = record.checker;
    assert.equal(checker.reasonPolicy, "diagnostic-only");
    assert.equal(checker.details.length, checker.total);
    assert.equal(checker.falsePositives, checker.details.filter((d) => d.outcome === "false-positive").length);
    assert.equal(checker.missed, checker.details.filter((d) => d.outcome === "missed").length);
    assert.equal(checker.correct, checker.total - checker.falsePositives - checker.missed);
    assert.equal(checker.pass, checker.deterministic && checker.falsePositives === 0 && checker.missed === 0);
    assert.equal(record.serviceOutcome, record.service.failedScenarios === 0 ? "semantic-pass" : "semantic-fail");
    assert.equal(record.reward, record.serviceOutcome === "semantic-pass" && checker.pass ? 1 : 0);
    assert.equal(record.outcome, record.reward === 1 ? "semantic-pass" : "semantic-fail", "overall outcome must include required checker");
    assert.equal(record.recurrence, record.reward === 0);
    assert.equal(record.progress.successorAttempts, 3);
    const rewardsSoFar = [record.trial2Reward, record.trial3Reward, record.reward];
    assert.equal(record.progress.failures, rewardsSoFar.filter((r) => r === 0).length);
    assert.equal(record.progress.solverPasses, rewardsSoFar.filter((r) => r === 1).length);
    let expectedConsecutive = 0;
    for (let i = rewardsSoFar.length - 1; i >= 0 && rewardsSoFar[i] === 0; i--) expectedConsecutive++;
    assert.equal(record.progress.consecutiveRecordedZeroes, expectedConsecutive);
    assert.equal(record.progress.remainingAttempts, 3);
    assert.equal(record.progress.failuresNeeded, Math.max(0, 5 - record.progress.failures));
    assert.equal(record.progress.withinFiveOfSix, record.progress.failures + 3 >= 5);
    for (const provider of ["claude", "codex"]) {
      assert.equal(record.progress.attemptsByProvider[provider], record.target === provider ? 3 : 0);
      assert.equal(record.progress.remainingByProvider[provider], 3 - record.progress.attemptsByProvider[provider]);
    }
    for (const key of ["completionSha256", "resultSha256", "gradeSha256", "packageDigest", "profileDigest"])
      assert.match(record[key], hash, `${record.id}:${key}`);
    assert.ok(record.manifestFilesVerified > 0 && record.manifestBytesVerified > 0);
    assert.equal(record.totalElapsedMilliseconds, Date.parse(record.end) - Date.parse(record.start));
    assert.ok(!/\/Users\/|\.local\//.test(JSON.stringify(record)), "nonportable/private Trial 4 record");
    assert.ok(readFileSync(join(root, record.analysis), "utf8").includes("## Trial 4"));
    round4Files += record.manifestFilesVerified;
    round4Bytes += record.manifestBytesVerified;
  }
  assert.equal(round4.audit.manifestFilesVerified, round4Files);
  assert.equal(round4.audit.manifestBytesVerified, round4Bytes);
  assert.equal(round4.audit.newModelCalls, 0);
  assert.deepEqual(round4.audit.errors, []);
  successorRecords.push(...round4.packages);
  retrialVerifiedFiles += round4Files;
  const belowThresholdPackages = round4.packages.filter((p) => p.progress.withinFiveOfSix === false);
  assert.equal(belowThresholdPackages.length, 1);
  assert.equal(belowThresholdPackages[0].id, "snapshot-recovery-repair");
  const preparedNext = read("reports/screening/evidence/2026-09-09-round-five-continuing-four-preparation.json");
  assert.equal(preparedNext.evidenceClass, "trial-preparation-no-provider-calls");
  assert.equal(preparedNext.providerCallsMade, 0);
  assert.equal(preparedNext.concurrency, 4);
  assert.equal(preparedNext.maxProviderCalls, 4);
  assert.equal(preparedNext.automaticRetries, 0);
  assert.equal(preparedNext.packages.length, 4);
  const continuing = round4.packages.filter((p) => p.progress.withinFiveOfSix);
  assert.deepEqual(preparedNext.packages.map((p) => p.id).sort(), continuing.map((p) => p.id).sort());
  assert.equal(preparedNext.packages.filter((p) => p.target === "codex").length, 3);
  assert.equal(preparedNext.packages.filter((p) => p.target === "claude").length, 1);
  for (const plan of preparedNext.packages) {
    const prior = continuing.find((p) => p.id === plan.id);
    assert.equal(plan.foundry.digest, prior.packageDigest);
    assert.equal(plan.previousTarget, prior.target);
    assert.equal(plan.target, prior.target === "claude" ? "codex" : "claude");
    assert.deepEqual(plan.progressBeforeDispatch, prior.progress);
    assert.deepEqual(plan.priorRewards, [prior.trial2Reward, prior.trial3Reward, prior.reward]);
    const providerSource = round4.packages.find((p) => p.id === plan.assignedProfile.sourcePackage);
    assert.equal(providerSource.target, plan.target);
    assert.equal(plan.assignedProfile.digest, providerSource.profileDigest);
    assert.equal(plan.previousTrial.profileDigest, prior.profileDigest);
    assert.equal(plan.previousTrial.reward, prior.reward);
  }
  const round5 = read("reports/screening/evidence/2026-09-09-round-five-continuing-four.json");
  assert.equal(round5.packages.length, 4);
  assert.equal(new Set(round5.packages.map((p) => p.id)).size, 4);
  assert.equal(round5.automaticRetries, 0);
  assert.equal(round5.invalidExecutionCount, 0);
  assert.deepEqual(round5.packages.map((p) => p.id).sort(), continuing.map((p) => p.id).sort());
  assert.equal(round5.excludedPackage.id, "snapshot-recovery-repair");
  assert.equal(round5.acceptanceTarget.minimumFailures, 5);
  assert.equal(round5.acceptanceTarget.totalScoredTrials, 6);
  assert.equal(round5.acceptanceTarget.consecutiveFailuresRequired, false);
  let round5Files = 0;
  let round5Bytes = 0;
  for (const record of round5.packages) {
    const priorTrial4 = continuing.find((p) => p.id === record.id);
    assert.ok(priorTrial4, "Trial 5 must extend an existing Trial 4 record");
    assert.equal(record.trial2Reward, priorTrial4.trial2Reward);
    assert.equal(record.trial3Reward, priorTrial4.trial3Reward);
    assert.equal(record.trial4Reward, priorTrial4.reward);
    assert.equal(record.packageDigest, priorTrial4.packageDigest, "Trial 5 changed the package");
    assert.equal(record.previousTarget, priorTrial4.target);
    assert.equal(record.providerSwitched, true);
    assert.notEqual(record.target, record.previousTarget, "Trial 5 did not switch providers");
    const attemptKey = `${round5.campaign}/${record.runId}`;
    assert.ok(!attemptKeys.has(attemptKey), "duplicate campaign attempt");
    attemptKeys.add(attemptKey);
    assert.equal(record.captureStatus, "completed");
    assert.equal(record.service.invalidScenarios, 0);
    const checker = record.checker;
    assert.equal(checker.reasonPolicy, "diagnostic-only");
    assert.equal(checker.details.length, checker.total);
    assert.equal(checker.falsePositives, checker.details.filter((d) => d.outcome === "false-positive").length);
    assert.equal(checker.missed, checker.details.filter((d) => d.outcome === "missed").length);
    assert.equal(checker.correct, checker.total - checker.falsePositives - checker.missed);
    assert.equal(checker.pass, checker.deterministic && checker.falsePositives === 0 && checker.missed === 0);
    assert.equal(record.serviceOutcome, record.service.failedScenarios === 0 ? "semantic-pass" : "semantic-fail");
    assert.equal(record.reward, record.serviceOutcome === "semantic-pass" && checker.pass ? 1 : 0);
    assert.equal(record.outcome, record.reward === 1 ? "semantic-pass" : "semantic-fail", "overall outcome must include required checker");
    assert.equal(record.recurrence, record.reward === 0);
    assert.equal(record.progress.successorAttempts, 4);
    const rewardsSoFar = [record.trial2Reward, record.trial3Reward, record.trial4Reward, record.reward];
    assert.equal(record.progress.failures, rewardsSoFar.filter((r) => r === 0).length);
    assert.equal(record.progress.solverPasses, rewardsSoFar.filter((r) => r === 1).length);
    assert.equal(record.progress.remainingAttempts, 2);
    assert.equal(record.progress.failuresNeeded, Math.max(0, 5 - record.progress.failures));
    assert.equal(record.progress.withinFiveOfSix, record.progress.failures + 2 >= 5);
    for (const provider of ["claude", "codex"]) {
      const expectedAttempts = (record.previousTarget === provider ? 3 : 0) + (record.target === provider ? 1 : 0);
      assert.equal(record.progress.attemptsByProvider[provider], expectedAttempts);
      assert.equal(record.progress.remainingByProvider[provider], 3 - expectedAttempts);
    }
    for (const key of ["completionSha256", "resultSha256", "gradeSha256", "packageDigest", "profileDigest"])
      assert.match(record[key], hash, `${record.id}:${key}`);
    assert.ok(record.manifestFilesVerified > 0 && record.manifestBytesVerified > 0);
    assert.equal(record.totalElapsedMilliseconds, Date.parse(record.end) - Date.parse(record.start));
    assert.ok(!/\/Users\/|\.local\//.test(JSON.stringify(record)), "nonportable/private Trial 5 record");
    assert.ok(readFileSync(join(root, record.analysis), "utf8").includes("Trial 5"));
    round5Files += record.manifestFilesVerified;
    round5Bytes += record.manifestBytesVerified;
  }
  assert.equal(round5.audit.manifestFilesVerified, round5Files);
  assert.equal(round5.audit.manifestBytesVerified, round5Bytes);
  assert.equal(round5.audit.newModelCalls, 0);
  assert.deepEqual(round5.audit.errors, []);
  successorRecords.push(...round5.packages);
  retrialVerifiedFiles += round5Files;
  const belowThresholdAfterRound5 = round5.packages.filter((p) => p.progress.withinFiveOfSix === false);
  assert.equal(belowThresholdAfterRound5.length, 1);
  assert.equal(belowThresholdAfterRound5[0].id, "temporal-capacity-repair");
  const coverage = read("reports/screening/evidence/2026-09-09-final-six-pass-audit.json");
  const finalPrepared = read("reports/screening/evidence/2026-09-09-final-six-preparation.json");
  const policyPath = "data/final-six-grading-controls/policy.json";
  const policy = read(policyPath);
  const sha = p => createHash("sha256").update(readFileSync(join(root,p))).digest("hex");
  assert.equal(coverage.providerCallsMade, 0);
  assert.equal(coverage.gradingRevision, policy.revision);
  assert.equal(coverage.rows.length, 7);
  assert.equal(coverage.oracles.length, 2);
  assert.ok(coverage.oracles.every(o => o.pass && o.deterministic));
  assert.deepEqual(coverage.errors, []);
  assert.equal(finalPrepared.gradingPolicySha256, sha(policyPath));
  assert.equal(finalPrepared.supplementRunnerSha256, sha("scripts/grade-final-six-supplement.mjs"));
  for (const c of policy.controls) assert.equal(c.sha256, sha(c.fixture));
  for (const r of coverage.rows) {
    assert.equal(r.effectiveReward, Math.min(r.recordedReward, r.supplement.pass ? 1 : 0));
    assert.equal(r.supplement.policySha256, finalPrepared.gradingPolicySha256);
    assert.equal(r.supplement.fixtureSha256, policy.controls.find(c => c.id === r.id).sha256);
    assert.equal(r.supplement.correct, r.supplement.details.filter(d => d.correct).length);
    assert.equal(r.supplement.pass, r.supplement.deterministic && r.supplement.correct === r.supplement.total);
    const prior = r.trial === 3 ? repeat.packages : r.trial === 4 ? round4.packages : r.trial === 5 ? round5.packages : successorRecords;
    const source = prior.find(p => p.id === r.id && p.gradeSha256 === r.gradeSha256);
    assert.ok(source, `${r.id} Trial ${r.trial}: no matching published raw grade`);
    assert.equal(source.reward, r.recordedReward);
    assert.equal(source.packageDigest, r.packageDigest);
  }
  const correctedPasses = coverage.rows.filter(r => r.recordedReward !== r.effectiveReward);
  assert.deepEqual(correctedPasses.map(r => [r.id,r.trial]), [["temporal-capacity-repair",3],["snapshot-recovery-repair",3]]);
  assert.equal(finalPrepared.providerCallsMade, 0);
  assert.equal(finalPrepared.maxProviderCalls, 11);
  assert.equal(finalPrepared.maxConcurrent, 3);
  const expansion = read("reports/screening/evidence/2026-09-09-final-six-concurrency-amendment.json");
  assert.equal(expansion.maxConcurrent, 6);
  assert.equal(expansion.maximumTotalAttempts, finalPrepared.maxProviderCalls);
  assert.equal(expansion.providerCallsMadeByPreparation, 0);
  assert.equal(expansion.originalPreparationPreserved, true);
  assert.equal(expansion.originalPreparationSha256, sha("reports/screening/evidence/2026-09-09-final-six-preparation.json"));
  assert.equal(expansion.expansionScriptSha256, sha(expansion.expansionScript));
  assert.equal(expansion.activeSlotsObserved.length + expansion.additionalInitialSlots.length, 6);
  assert.equal(finalPrepared.packages.length, 5);
  for (const p of finalPrepared.packages) {
    assert.equal(p.scored,p.effectiveHistory.length);
    assert.equal(p.failures,p.effectiveHistory.filter(r => r === 0).length);
    assert.equal(p.remaining,6-p.scored);
    assert.equal(p.slots.length,p.remaining);
    assert.ok(p.failures+p.remaining >= 5);
    assert.equal(p.target,["incremental-build-repair","snapshot-recovery-repair"].includes(p.id) ? "claude" : "codex");
    assert.ok(readFileSync(join(root,p.analysis),"utf8").includes("Final-six audit and preparation"));
    for (const r of coverage.rows.filter(r => r.id === p.id)) assert.equal(p.effectiveHistory[r.trial-2],r.effectiveReward);
  }
  const canReachFive = (failures, scored) => scored < 6 && failures + (6 - scored) >= 5;
  const finalSix = read("reports/screening/evidence/2026-09-09-final-six.json");
  assert.equal(finalSix.gradingRevision, "final-six-coverage-v1");
  assert.equal(finalSix.automaticRetries, 0);
  assert.equal(finalSix.maxProviderCallsAuthorized, 11);
  assert.equal(finalSix.providerCallsMade, 6);
  assert.equal(finalSix.concurrencyAmendment.originalMaxConcurrent, 3);
  assert.equal(finalSix.concurrencyAmendment.amendedMaxConcurrent, 6);
  assert.equal(finalSix.concurrencyAmendment.liveContainersOrCredentialsDisturbed, false);
  assert.equal(finalSix.packages.length, 5);
  assert.deepEqual(finalSix.packages.map((p) => p.id).sort(), finalPrepared.packages.map((p) => p.id).sort());
  let finalSixFiles = 0;
  let finalSixBytes = 0;
  let finalSixAttempts = 0;
  for (const record of finalSix.packages) {
    const plan = finalPrepared.packages.find((p) => p.id === record.id);
    assert.ok(plan, "final-six result must extend a prepared package");
    assert.ok(readFileSync(join(root, record.analysis), "utf8").includes("final-six campaign"));
    let failures = plan.failures;
    let scored = plan.scored;
    const providerCounts = {claude: plan.target === "claude" ? plan.scored - 3 : 3, codex: plan.target === "codex" ? plan.scored - 3 : 3};
    let slotIndex = 0;
    for (const a of record.attempts) {
      finalSixAttempts++;
      assert.ok(canReachFive(failures, scored), "final-six dispatched after elimination");
      assert.equal(a.trial, plan.slots[slotIndex++].trial);
      assert.equal(a.target, plan.target);
      assert.equal(a.packageDigest, plan.packageDigest);
      assert.equal(a.profileDigest, plan.profileDigest);
      providerCounts[a.target]++;
      const key = `${finalSix.campaign}/${record.id}/trial-${a.trial}`;
      assert.ok(!attemptKeys.has(key), "duplicate final-six attempt");
      attemptKeys.add(key);
      assert([0, 1].includes(a.recordedReward));
      assert.equal(a.service.invalidScenarios, 0);
      assert.equal(a.checker.pass, a.checker.deterministic && a.checker.falsePositives === 0 && a.checker.missed === 0);
      assert.equal(a.recordedReward, a.service.failedScenarios === 0 && a.checker.pass ? 1 : 0);
      if (a.supplement !== null) assert.equal(a.supplement.pass, a.supplement.deterministic && a.supplement.correct === a.supplement.total);
      assert.equal(a.effectiveReward, Math.min(a.recordedReward, a.supplement === null || a.supplement.pass ? 1 : 0));
      scored++;
      if (a.effectiveReward === 0) failures++;
      assert.equal(a.cumulativeFailures, failures);
      assert.equal(a.cumulativeScored, scored);
      assert.equal(a.canStillReachFive, canReachFive(failures, scored));
      for (const key of ["completionSha256", "resultSha256", "gradeSha256", "packageDigest", "profileDigest"])
        assert.match(a[key], hash, `${record.id} Trial ${a.trial}: ${key}`);
      assert.ok(a.manifestFilesVerified > 0 && a.manifestBytesVerified > 0);
      finalSixFiles += a.manifestFilesVerified;
      finalSixBytes += a.manifestBytesVerified;
      successorRecords.push({...a, id: record.id, reward: a.recordedReward});
    }
    assert.deepEqual(record.attemptsByProvider, providerCounts);
    assert.deepEqual(record.recordedHistory, [...plan.recordedHistory,...record.attempts.map(a => a.recordedReward)]);
    assert.deepEqual(record.effectiveHistory, [...plan.effectiveHistory,...record.attempts.map(a => a.effectiveReward)]);
    assert.deepEqual(record.unusedTrials, plan.slots.slice(slotIndex).map(s => s.trial));
    assert.equal(record.finalFailures, failures);
    assert.equal(record.finalScored, scored);
    if (record.classification === "meets-5-of-6") {
      assert.ok(failures >= 5 && scored === 6);
      assert.deepEqual(providerCounts, {claude:3,codex:3});
    }
    else if (record.classification === "cannot-reach-5-of-6") assert.ok(failures + 6 - scored < 5);
    else assert.equal(record.classification, "unresolved-infrastructure");
    assert.ok(!/\/Users\/|\.local\//.test(JSON.stringify(record)), "nonportable/private final-six record");
  }
  assert.equal(finalSixAttempts, 6);
  assert.equal(finalSix.audit.manifestFilesVerified, finalSixFiles);
  assert.equal(finalSix.audit.manifestBytesVerified, finalSixBytes);
  retrialVerifiedFiles += finalSixFiles;
  assert.equal(finalSix.audit.newModelCalls, 0);
  assert.deepEqual(finalSix.audit.errors, []);
  assert.deepEqual(finalSix.classificationSummary.meetsFiveOfSix, ["incremental-build-repair"]);
  assert.deepEqual(
    finalSix.classificationSummary.cannotReachFiveOfSix.sort(),
    ["variant-cache-repair", "issued-report-repair", "temporal-capacity-repair", "snapshot-recovery-repair"].sort(),
  );
  assert.deepEqual(finalSix.classificationSummary.unresolvedInfrastructure, []);
  assert.deepEqual(finalSix.auditReference.correctedPasses, coverage.rows.filter(r => r.recordedReward !== r.effectiveReward).map(r => ({id: r.id, trial: r.trial, recordedReward: r.recordedReward, effectiveReward: r.effectiveReward})));
  const buildHistory = finalSix.publicationReview.buildSixRunHistory;
  assert.deepEqual(buildHistory.map(r => r.trial), [2,3,4,5,6,7]);
  assert.deepEqual(buildHistory.map(r => r.target), ["codex","codex","codex","claude","claude","claude"]);
  assert.equal(new Set(buildHistory.map(r => r.packageDigest)).size, 1);
  assert.equal(new Set(buildHistory.map(r => r.instructionSha256)).size, 1);
  assert.equal(new Set(buildHistory.map(r => r.checkerGradeSummarySha256)).size, 1);
  assert.equal(new Set(buildHistory.map(r => r.checkerSourceSha256)).size, 6);
  for (const r of buildHistory) {
    assert.equal(r.recordedReward, 0);
    assert.equal(r.servicePassed,27); assert.equal(r.serviceTotal,27);
    assert.equal(r.checkerCorrect,14); assert.equal(r.checkerTotal,15);
    assert.equal(r.falsePositives,0); assert.deepEqual(r.missedCandidates,["premature-publication"]);
  }
  assert.deepEqual(finalSix.successorTotals, {
    distinctPackages:25, attempts:successorRecords.length,
    scored:successorRecords.filter(r => r.reward !== null).length,
    recordedZeroRewards:successorRecords.filter(r => r.reward === 0).length,
    recordedPasses:successorRecords.filter(r => r.reward === 1).length,
    effectiveFailures:successorRecords.filter(r => r.reward === 0).length + correctedPasses.length,
    effectivePasses:successorRecords.filter(r => r.reward === 1).length - correctedPasses.length,
    historicalInfrastructureInterruptions:successorRecords.filter(r => r.reward === null).length,
  });
  const successorPackageIds = new Set(successorRecords.map((p) => p.id));
  const scoredPackageIds = new Set(successorRecords.filter((p) => p.reward !== null).map((p) => p.id));
  assert.deepEqual([...successorPackageIds].sort(), [...ids].sort(), "every package has a Trial 2 record");
  assert.deepEqual([...scoredPackageIds].sort(), [...ids].sort(), "every package has a scored Trial 2 result");
  const walk = (dir, prefix = "") =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      assert.ok(!entry.isSymbolicLink(), "publication symlink");
      return entry.isDirectory()
        ? walk(join(dir, entry.name), `${prefix}${entry.name}/`)
        : [`${prefix}${entry.name}`];
    });
  assert.deepEqual(
    walk(join(root, "reports/screening")).sort(),
    expected.sort(),
    "unaccounted screening artifact",
  );
  const documents = [
    "README.md",
    "docs/project-status.md",
    "docs/round-three-failing-five-handoff.md",
    "docs/round-four-failing-five-handoff.md",
    "docs/round-five-continuing-four-handoff.md",
    "docs/final-six-handoff.md",
    "docs/engineering-progress.md",
    "docs/artifact-lifecycle.md",
    "reports/PORTFOLIO-PUBLICATION.md",
    ...expected.filter((p) => p.endsWith(".md")).map((p) => `reports/screening/${p}`),
  ];
  for (const doc of documents) {
    const text = readFileSync(join(root, doc), "utf8");
    for (const [, target] of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^https?:|^#/.test(target)) continue;
      const path = resolve(root, dirname(doc), target.split("#")[0]);
      assert.ok(
        !target.startsWith("/") && !target.includes(".local/") && !relative(root, path).startsWith(".."),
        `${doc}: nonportable link`,
      );
      assert.ok(existsSync(path), `${doc}: missing ${target}`);
    }
  }
  const promotion = read("reports/portfolio-promotion-manifest.json");
  assert.equal(promotion.kind, "source-promotion-receipt");
  assert.ok(promotion.paths.length > 0);
  assert.equal(new Set(promotion.paths.map((p) => p.path)).size, promotion.paths.length);
  for (const p of promotion.paths) {
    assert.match(p.integratedSha256, hash);
    assert.match(p.selectedSourceSha256, hash);
    assert.ok(!p.path.startsWith("/") && !p.path.split("/").includes(".."));
  }
  return {
    screenedPackages: ids.size,
    trialTwoAttempts: trialTwoCounts.attempts,
    trialTwoScored: trialTwoCounts.scored,
    trialTwoZeroRewards: trialTwoCounts.zeroes,
    trialTwoSolverPasses: trialTwoCounts.passes,
    trialThreeAttempts: repeat.packages.length,
    trialThreeZeroRewards: repeat.packages.filter((p) => p.reward === 0).length,
    packagesWithTwoConsecutiveZeroes: repeat.packages.filter((p) => p.progress.consecutiveRecordedZeroes === 2).length,
    trialFourAttempts: round4.packages.length,
    trialFourZeroRewards: round4.packages.filter((p) => p.reward === 0).length,
    packagesWithThreeConsecutiveZeroes: round4.packages.filter((p) => p.progress.consecutiveRecordedZeroes === 3).length,
    packagesBelowFiveOfSixThreshold: belowThresholdPackages.length,
    continuingPackages: continuing.length,
    nextPreparedAttempts: preparedNext.packages.length,
    trialFiveAttempts: round5.packages.length,
    trialFiveZeroRewards: round5.packages.filter((p) => p.reward === 0).length,
    trialFiveProviderSwitchesConfirmed: round5.packages.filter((p) => p.providerSwitched === true).length,
    packagesBelowFiveOfSixThresholdAfterTrialFive: belowThresholdAfterRound5.length,
    regradedFalsePasses: correctedPasses.length,
    continuingPackagesAfterCoverageRepair: finalPrepared.packages.length,
    finalPreparedPackages: finalPrepared.packages.length,
    finalPreparedSlots: finalPrepared.packages.reduce((n,p) => n+p.remaining,0),
    finalSixAttemptsMade: finalSixAttempts,
    finalSixMeetsFiveOfSix: finalSix.classificationSummary.meetsFiveOfSix.length,
    finalSixCannotReachFiveOfSix: finalSix.classificationSummary.cannotReachFiveOfSix.length,
    finalSixUnresolvedInfrastructure: finalSix.classificationSummary.unresolvedInfrastructure.length,
    successorEffectiveZeroRewards: successorRecords.filter(p => p.reward === 0).length + correctedPasses.length,
    successorEffectivePasses: successorRecords.filter(p => p.reward === 1).length - correctedPasses.length,
    manifestListedFilesVerifiedAtPublication: verifiedFiles,
    successorTrials: successorRecords.length,
    successorPackages: successorPackageIds.size,
    successorCompletedTrials: successorRecords.filter((p) => p.reward !== null).length,
    successorRecordedZeroRewards: successorRecords.filter((p) => p.reward === 0).length,
    successorSolverPasses: successorRecords.filter((p) => p.reward === 1).length,
    successorInterruptedTrials: successorRecords.filter((p) => p.reward === null).length,
    successorManifestListedFilesVerifiedAtPublication: retrialVerifiedFiles,
    documents: documents.length,
    promotedPaths: promotion.paths.length,
    providerCallsMade: 0,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(verifyPublication()));
