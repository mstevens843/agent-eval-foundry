// Portable publication checks only: no raw transcripts, credentials, Docker or provider calls.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeContinuationPlan } from "./hardened-continuation-policy.mjs";
import { buildFinalResults } from "./final-screening-results.mjs";

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
  "final-results-2026-09-11.md",
  "evidence/2026-09-11-final-results.json",
  "route-trial-seven-pass-audit-2026-09-11.md",
  "evidence/2026-09-11-route-trial-seven-pass-audit.json",
  "hardened-six-continuation-preparation-2026-09-11.md",
  "evidence/2026-09-11-hardened-six-counting-ledger.json",
  "evidence/2026-09-11-hardened-six-continuation-preparation.json",
  "browser-coverage-v3-2026-09-11.md",
  "evidence/2026-09-11-browser-coverage-v3.json",
  "evidence/2026-09-11-browser-coverage-v3-generators.json",
  "evidence/2026-09-11-browser-round-four-disposition.json",
  "evidence/2026-09-11-hardened-next-five-trial-five-preparation.json",
  "hardened-round-four-pass-audit-2026-09-11.md",
  "evidence/2026-09-11-hardened-round-four-pass-audit.json",
  "browser-runtime-reliability-2026-09-11.md",
  "evidence/2026-09-11-browser-runtime-reliability.json",
  "evidence/2026-09-11-hardened-next-five-trial-four-preparation.json",
  "evidence/2026-09-11-hardened-next-five-trial-three-preparation.json",
  "evidence/2026-09-11-next-five-generators.json",
  "next-five-coverage-v2-2026-09-11.md",
  "evidence/2026-09-11-next-five-coverage-v2.json",
  "evidence/2026-09-11-hardened-next-five-trial-two-preparation.json",
  "next-five-successor-implementation-2026-09-10.md",
  "evidence/2026-09-10-next-five-successors.json",
  "evidence/2026-09-10-next-five-generators.json",
  "next-five-hardening-2026-09-10.md",
  "next-five-hardening-coverage-2026-09-10.md",
  "evidence/2026-09-10-next-five-hardening.json",
  "evidence/2026-09-10-next-five-hardening-generators.json",
  "evidence/2026-09-10-hardened-next-five-trial-one-preparation.json",
  "final-results-2026-09-09.md",
  "evidence/2026-09-09-final-results.json",
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
  "post-final-pass-audit-2026-09-09.md",
  "evidence/2026-09-09-post-final-pass-audit.json",
  "evidence/2026-09-09-post-final-five-preparation.json",
  "post-final-five-2026-09-09.md",
  "evidence/2026-09-09-post-final-five.json",
  "remaining-pass-audit-2026-09-09.md",
  "evidence/2026-09-09-remaining-pass-audit.json",
  "evidence/2026-09-09-three-replacement-disposition.json",
  "evidence/2026-09-09-three-replacements-preparation.json",
  "three-replacements-2026-09-09.md",
  "evidence/2026-09-09-three-replacements.json",
  "hardened-next-five-trial-one-2026-09-10.md",
  "evidence/2026-09-10-hardened-next-five-trial-one.json",
  "hardened-next-five-trial-two-2026-09-11.md",
  "evidence/2026-09-11-hardened-next-five-trial-two.json",
  "hardened-next-five-trial-three-2026-09-11.md",
  "evidence/2026-09-11-hardened-next-five-trial-three.json",
  "hardened-next-five-trial-four-2026-09-11.md",
  "evidence/2026-09-11-hardened-next-five-trial-four.json",
  "hardened-six-continuation-2026-09-11.md",
  "evidence/2026-09-11-hardened-six-continuation.json",
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
  // Preserve campaign-close evidence above; apply the later audit as a separate
  // grading revision over the SAME attempts, never by changing the denominator.
  const postAudit = read("reports/screening/evidence/2026-09-09-post-final-pass-audit.json");
  const postPolicy = read(postAudit.policy.path);
  assert.equal(postAudit.gradingRevision, "post-final-coverage-v2");
  assert.equal(postAudit.gradingRevision, postPolicy.revision);
  assert.equal(postAudit.providerCallsMade, 0);
  assert.equal(postAudit.previousEvidence.sha256, sha(postAudit.previousEvidence.path));
  assert.equal(postAudit.previousEvidence.path, "reports/screening/evidence/2026-09-09-final-six.json");
  assert.equal(postAudit.policy.sha256, sha(postAudit.policy.path));
  assert.equal(postPolicy.extends.path, policyPath);
  assert.equal(postPolicy.extends.sha256, sha(policyPath));
  assert.equal(postAudit.runnerSha256, sha("scripts/grade-post-final-supplement.mjs"));
  assert.equal(postAudit.reproductionSha256, sha("scripts/reproduce-post-final-pass-audit.mjs"));
  assert.equal(postAudit.rows.length, 19);
  assert.equal(postAudit.generated.length, 4);
  assert.equal(postPolicy.controls.length, 4);
  const auditedIds = new Set(postPolicy.controls.map(c => c.id));
  assert.equal(auditedIds.size, 4);
  for (const control of postPolicy.controls) {
    assert.equal(control.sha256, sha(control.fixture));
    const fixture = read(control.fixture);
    assert.equal(fixture.cases.length, 2);
    assert.deepEqual(fixture.cases.map(c => c.token), control.expected.map(c => c.token));
    assert.deepEqual(control.expected.map(c => c.ok), [true, control.id !== "snapshot-recovery-repair"]);
    for (const candidate of fixture.cases) for (const cell of candidate.cells) {
      for (const forbidden of ["expected", "checks", "status", "failures", "truth", "groundTruth"])
        assert.equal(Object.hasOwn(cell, forbidden), false, "Private verdict leaked into checker input");
    }
  }
  for (const generated of postAudit.generated) {
    assert.equal(generated.sourceSha256, sha(generated.sourcePath));
    assert.equal(generated.scenarioSha256, sha(generated.scenarioPath));
    assert.equal(generated.baselineStatus, "semantic-pass");
    assert.equal(generated.controlStatus, generated.id === "snapshot-recovery-repair" ? "semantic-fail" : "semantic-pass");
    assert.match(generated.baselineTraceSha256, hash);
    assert.match(generated.controlTraceSha256, hash);
    assert.equal(generated.packageDigest, finalPrepared.packages.find(p => p.id === generated.id).packageDigest);
  }
  const postKeys = new Set();
  for (const row of postAudit.rows) {
    const prior = finalSix.packages.find(p => p.id === row.id);
    assert(auditedIds.has(row.id));
    assert(!postKeys.has(`${row.id}:${row.trial}`), "Duplicate regraded attempt");
    postKeys.add(`${row.id}:${row.trial}`);
    assert.equal(row.recordedReward, prior.recordedHistory[row.trial - 2]);
    assert.equal(row.previousEffectiveReward, prior.effectiveHistory[row.trial - 2]);
    const source = successorRecords.find(p => p.id === row.id && p.gradeSha256 === row.gradeSha256
      && p.resultSha256 === row.resultSha256 && p.completionSha256 === row.completionSha256);
    assert(source, "Post-final regrade has no original published grade");
    assert.equal(source.reward, row.recordedReward);
    assert.equal(source.packageDigest, row.packageDigest);
    assert.equal(source.resultSha256, row.resultSha256);
    assert.equal(source.completionSha256, row.completionSha256);
    assert.equal(source.target, row.provider);
    for (const key of ["checkerSha256", "publicContractSha256", "instructionSha256"]) assert.match(row[key], hash);
    const expectedControls = [...policy.controls, ...postPolicy.controls].filter(c => c.id === row.id).flatMap(c => c.expected);
    assert.deepEqual(row.supplement.details.map(d => ({token:d.token, ok:d.expectedOk})), expectedControls);
    for (const detail of row.supplement.details) assert.equal(detail.correct, detail.actualOk === detail.expectedOk);
    assert.equal(row.supplement.total, expectedControls.length);
    assert.equal(row.supplement.correct, row.supplement.details.filter(d => d.correct).length);
    assert.equal(row.supplement.pass, row.supplement.deterministic && row.supplement.exactTokens && row.supplement.correct === row.supplement.total);
    assert.equal(row.effectiveReward, Math.min(row.recordedReward, row.supplement.pass ? 1 : 0));
    assert(row.effectiveReward <= row.previousEffectiveReward);
    assert(readFileSync(join(root, prior.analysis), "utf8").includes("Post-final pass audit — September 9, 2026"));
  }
  for (const id of auditedIds) {
    const rows = postAudit.rows.filter(r => r.id === id);
    const prior = finalSix.packages.find(p => p.id === id);
    assert.deepEqual(rows.map(r => r.trial), prior.recordedHistory.map((_, i) => i + 2), "Every retained attempt must receive the same regrade");
    assert.equal(new Set(rows.map(r => r.publicContractSha256)).size, 1);
    assert.equal(new Set(rows.map(r => r.instructionSha256)).size, 1);
  }
  const postCorrections = postAudit.rows.filter(r => r.previousEffectiveReward !== r.effectiveReward);
  assert.deepEqual(postCorrections.map(r => [r.id, r.trial]), [
    ["variant-cache-repair", 5], ["issued-report-repair", 5], ["issued-report-repair", 6],
    ["temporal-capacity-repair", 5], ["temporal-capacity-repair", 6], ["snapshot-recovery-repair", 5],
  ]);
  assert.deepEqual(postAudit.correctedPasses, postCorrections.map(({id, trial, provider, recordedReward, previousEffectiveReward, effectiveReward}) => ({id, trial, provider, recordedReward, previousEffectiveReward, effectiveReward})));
  assert.equal(postAudit.oracles.length, 4);
  assert(postAudit.oracles.every(o => o.pass && o.correct === o.total));
  assert.equal(postAudit.oracles.reduce((n, o) => n + o.total, 0), 12);
  assert.equal(postAudit.serviceChecks.length, 8);
  assert(postAudit.serviceChecks.every(s => s.status === "semantic-pass" && s.failures.length === 0));
  assert.equal(postAudit.manifests.recordsVerified, 19);
  assert(postAudit.manifests.filesVerified > 0 && postAudit.manifests.bytesVerified > 0);
  assert.equal(postAudit.manifests.verifiedBeforeAndAfter, true);
  assert.deepEqual(postAudit.manifests.errors, []);
  assert.deepEqual(postAudit.classifications.map(p => p.id), finalSix.packages.map(p => p.id));
  for (const current of postAudit.classifications) {
    const prior = finalSix.packages.find(p => p.id === current.id);
    const rows = postAudit.rows.filter(r => r.id === current.id);
    assert.deepEqual(current.recordedHistory, prior.recordedHistory);
    assert.deepEqual(current.previousEffectiveHistory, prior.effectiveHistory);
    assert.deepEqual(current.effectiveHistory, rows.length ? rows.map(r => r.effectiveReward) : prior.effectiveHistory);
    assert.deepEqual(current.attemptsByProvider, prior.attemptsByProvider);
    assert.equal(current.scored, prior.finalScored);
    assert.equal(current.remaining, 6 - current.scored);
    assert.equal(current.failures, current.effectiveHistory.filter(r => r === 0).length);
    assert.equal(current.failuresNeeded, Math.max(0, 5 - current.failures));
    if (current.classification === "meets-5-of-6-complete") {
      assert.equal(current.scored, 6);
      assert(current.failures >= 5);
      assert.deepEqual(current.attemptsByProvider, {claude:3,codex:3});
    } else {
      assert.equal(current.classification, "reopened");
      assert(canReachFive(current.failures, current.scored));
    }
  }
  assert.deepEqual(postAudit.successorTotals, {...finalSix.successorTotals,
    effectiveFailures: finalSix.successorTotals.effectiveFailures + postCorrections.length,
    effectivePasses: finalSix.successorTotals.effectivePasses - postCorrections.length,
  });
  assert(!/\/Users\/|\.local\//.test(JSON.stringify(postAudit)), "Nonportable/private post-final evidence");
  const postPrepared = read("reports/screening/evidence/2026-09-09-post-final-five-preparation.json");
  assert.equal(postPrepared.maxConcurrent, 6);
  assert.equal(postPrepared.plannedConcurrentAttempts, 5);
  assert.equal(postPrepared.maxProviderCalls, 5);
  assert.equal(postPrepared.providerCallsMadeByPreparation, 0);
  assert.equal(postPrepared.automaticRetries, false);
  assert.equal(postPrepared.allSlotsStartTogether, true);
  assert.equal(postPrepared.snapshotTrialsIndependentAndUnconditional, true);
  assert.equal(postPrepared.gradingRevision, postAudit.gradingRevision);
  assert.equal(postPrepared.auditSha256, sha("reports/screening/evidence/2026-09-09-post-final-pass-audit.json"));
  assert.equal(postPrepared.originalPreparationSha256, sha("reports/screening/evidence/2026-09-09-final-six-preparation.json"));
  assert.equal(postPrepared.policySha256, postAudit.policy.sha256);
  assert.equal(postPrepared.graderSha256, postAudit.runnerSha256);
  assert.equal(postPrepared.runnerSha256, sha("scripts/run-post-final-five.mjs"));
  assert.deepEqual(postPrepared.packages, postAudit.classifications.filter(p => p.classification === "reopened"));
  assert.deepEqual(postPrepared.slots.map(s => [s.id, s.trial, s.target]), [
    ["variant-cache-repair", 7, "codex"], ["issued-report-repair", 7, "codex"],
    ["temporal-capacity-repair", 7, "codex"],
    ["snapshot-recovery-repair", 6, "claude"], ["snapshot-recovery-repair", 7, "claude"],
  ]);
  for (const slot of postPrepared.slots) {
    const original = finalPrepared.packages.find(p => p.id === slot.id);
    const frozen = original.slots.find(s => s.trial === slot.trial);
    assert.deepEqual(slot, {...frozen, id: original.id, target: original.target,
      analysis: original.analysis, packageDigest: original.packageDigest,
      profileDigest: original.profileDigest, instructionSha256: original.instructionSha256});
  }
  const postFinal = read("reports/screening/evidence/2026-09-09-post-final-five.json");
  assert.equal(postFinal.gradingRevision, "post-final-coverage-v2");
  assert.equal(postFinal.automaticRetries, 0);
  assert.equal(postFinal.maxProviderCallsAuthorized, 5);
  assert.equal(postFinal.providerCallsMade, 5);
  assert.equal(postFinal.concurrencyCap, 6);
  assert.equal(postFinal.packages.length, 4);
  assert.deepEqual(postFinal.packages.map((p) => p.id).sort(), postPrepared.packages.map((p) => p.id).sort());
  let postFinalFiles = 0;
  let postFinalBytes = 0;
  let postFinalAttempts = 0;
  for (const record of postFinal.packages) {
    const plan = postPrepared.packages.find((p) => p.id === record.id);
    assert.ok(plan, "post-final result must extend a reopened package");
    assert.ok(readFileSync(join(root, record.analysis), "utf8").includes("post-final-coverage-v2 campaign"));
    let failures = plan.failures;
    let scored = plan.scored;
    for (const a of record.attempts) {
      postFinalAttempts++;
      assert([0, 1].includes(a.recordedReward));
      assert.equal(a.checker.pass, a.checker.correct === a.checker.total && a.checker.missed === 0 && a.checker.falsePositives === 0);
      assert.equal(a.supplement.pass, a.supplement.deterministic && a.supplement.exactTokens && a.supplement.correct === a.supplement.total);
      assert.equal(a.effectiveReward, Math.min(a.recordedReward, a.supplement.pass ? 1 : 0));
      scored++;
      if (a.effectiveReward === 0) failures++;
      assert.equal(a.cumulativeFailures, failures);
      assert.equal(a.cumulativeScored, scored);
      for (const key of ["completionSha256", "resultSha256", "gradeSha256", "packageDigest", "profileDigest"])
        assert.match(a[key], hash, `${record.id} Trial ${a.trial}: ${key}`);
      assert.ok(a.manifestFilesVerified > 0 && a.manifestBytesVerified > 0);
      postFinalFiles += a.manifestFilesVerified;
      postFinalBytes += a.manifestBytesVerified;
    }
    assert.equal(scored, 6, `${record.id}: post-final campaign must close a complete six-run set`);
    assert.equal(record.finalFailures, failures);
    assert.equal(record.finalScored, scored);
    if (record.classification === "meets-5-of-6") assert.ok(failures >= 5);
    else if (record.classification === "cannot-reach-5-of-6") assert.ok(failures < 5);
    else assert.equal(record.classification, "unresolved-infrastructure");
    assert.ok(!/\/Users\/|\.local\//.test(JSON.stringify(record)), "nonportable/private post-final-five record");
  }
  assert.equal(postFinalAttempts, 5);
  assert.equal(postFinal.audit.manifestFilesVerified, postFinalFiles);
  assert.equal(postFinal.audit.manifestBytesVerified, postFinalBytes);
  assert.equal(postFinal.audit.newModelCalls, 0);
  assert.deepEqual(postFinal.audit.errors, []);
  assert.deepEqual(postFinal.classificationSummary.meetsFiveOfSix.sort(), ["issued-report-repair", "temporal-capacity-repair"].sort());
  assert.deepEqual(postFinal.classificationSummary.cannotReachFiveOfSix.sort(), ["variant-cache-repair", "snapshot-recovery-repair"].sort());
  assert.deepEqual(postFinal.classificationSummary.unresolvedInfrastructure, []);
  const remainingAudit = read("reports/screening/evidence/2026-09-09-remaining-pass-audit.json");
  assert.equal(remainingAudit.providerCallsMade, 0);
  assert.equal(remainingAudit.gradingRevision, "remaining-pass-coverage-v3");
  assert.equal(remainingAudit.previousEvidence.sha256, sha(remainingAudit.previousEvidence.path));
  assert.equal(remainingAudit.policy.sha256, sha(remainingAudit.policy.path));
  assert.equal(remainingAudit.runnerSha256, sha("scripts/grade-remaining-pass-supplement.mjs"));
  assert.equal(remainingAudit.reproductionSha256, sha("scripts/reproduce-remaining-pass-audit.mjs"));
  assert.equal(remainingAudit.authorityPatch.sha256, sha(remainingAudit.authorityPatch.path));
  const remainingPolicy = read(remainingAudit.policy.path);
  assert.equal(remainingPolicy.extends.sha256, sha(remainingPolicy.extends.path));
  for (const c of remainingPolicy.controls) assert.equal(c.sha256, sha(c.fixture));
  for (const c of remainingAudit.generated) {
    assert.equal(c.sourceSha256, sha(c.sourcePath));
    assert.equal(c.scenarioSha256, sha(c.scenarioPath));
  }
  const latestOriginals = postFinal.packages.flatMap(p => p.attempts.map(a => ({...a,id:p.id,reward:a.recordedReward})));
  const allOriginals = [...successorRecords, ...latestOriginals];
  assert.equal(remainingAudit.rows.length, 24);
  for (const id of auditedIds) {
    const rows = remainingAudit.rows.filter(r=>r.id===id);
    assert.deepEqual(rows.map(r=>r.trial),[2,3,4,5,6,7]);
    assert.equal(new Set(rows.map(r=>r.publicContractSha256)).size,1);
    assert.equal(new Set(rows.map(r=>r.instructionSha256)).size,1);
    for (const r of rows) {
      const original=allOriginals.find(p=>p.id===id&&p.resultSha256===r.resultSha256&&p.completionSha256===r.completionSha256&&p.gradeSha256===r.gradeSha256);
      assert(original,"Regrade must bind to the original submitted artifact");
      assert.equal(original.reward,r.recordedReward);assert.equal(original.packageDigest,r.packageDigest);assert.equal(original.target,r.provider);
      const previous=postFinal.packages.find(p=>p.id===id).attempts.find(a=>a.trial===r.trial)
        ?? postAudit.rows.find(a=>a.id===id&&a.trial===r.trial);
      assert.equal(r.previousEffectiveReward,previous.effectiveReward);
      const wanted=[...policy.controls,...postPolicy.controls,...remainingPolicy.controls].filter(c=>c.id===id).flatMap(c=>c.expected).map(({token,ok})=>({token,ok}));
      assert.deepEqual(r.supplement.details.map(d=>({token:d.token,ok:d.expectedOk})),wanted);
      for(const d of r.supplement.details)assert.equal(d.correct,d.actualOk===d.expectedOk);
      assert.equal(r.supplement.correct,r.supplement.details.filter(d=>d.correct).length);
      assert.equal(r.supplement.total,wanted.length);
      assert.equal(r.supplement.pass,r.supplement.deterministic&&r.supplement.exactTokens&&r.supplement.correct===r.supplement.total);
      assert.equal(r.effectiveReward,Math.min(r.recordedReward,r.supplement.pass?1:0));
    }
  }
  assert.deepEqual(remainingAudit.correctedPasses.map(r=>[r.id,r.trial]),[
    ["variant-cache-repair",6],["variant-cache-repair",7],["snapshot-recovery-repair",4],
  ]);
  assert.equal(remainingAudit.oracles.reduce((n,o)=>n+o.total,0),50);
  assert(remainingAudit.oracles.every(o=>o.pass&&o.correct===o.total));
  assert.equal(remainingAudit.serviceChecks.length,29);
  assert(remainingAudit.serviceChecks.every(s=>s.correctedStatus==="semantic-pass"));
  assert.equal(remainingAudit.manifests.recordsVerified,24);
  assert.equal(remainingAudit.manifests.verifiedBeforeAndAfter,true);
  assert.deepEqual(remainingAudit.manifests.errors,[]);
  const disposition=read("reports/screening/evidence/2026-09-09-three-replacement-disposition.json");
  assert.equal(disposition.audit.sha256,sha(disposition.audit.path));
  assert.equal(disposition.providerCallsMade,0);
  for(const p of disposition.packages){
    const audited=remainingAudit.classifications.find(a=>a.id===p.id);
    assert.equal(p.scored,p.countedAttempts.length);
    assert.equal(p.failures,p.countedAttempts.filter(a=>a.countedReward===0).length);
    assert.equal(p.remaining,6-p.scored);
    const both=[...p.countedAttempts,...p.voidAttempts].sort((a,b)=>a.trial-b.trial);
    assert.deepEqual(both.map(a=>a.trial),[2,3,4,5,6,7]);
    assert.deepEqual(both.map(a=>a.recordedReward),audited.recordedHistory);
    assert.deepEqual(both.map(a=>a.auditEffectiveReward),audited.effectiveHistory);
    for(const a of p.countedAttempts)assert.equal(a.countedReward,a.auditEffectiveReward);
    for(const a of p.voidAttempts){assert.equal(a.countedReward,null);assert(remainingAudit.correctedPasses.some(r=>r.id===p.id&&r.trial===a.trial));}
    if(p.remaining===0){assert(p.failures>=5);assert.deepEqual(p.attemptsByProvider,{claude:3,codex:3});}
  }
  assert.deepEqual(disposition.packages.map(p=>[p.id,p.failures,p.scored]),[
    ["incremental-build-repair",6,6],["variant-cache-repair",4,4],["issued-report-repair",6,6],["temporal-capacity-repair",5,6],["snapshot-recovery-repair",4,5],
  ]);
  const replacements=read("reports/screening/evidence/2026-09-09-three-replacements-preparation.json");
  assert.equal(replacements.auditSha256,sha("reports/screening/evidence/2026-09-09-three-replacement-disposition.json"));
  assert.equal(replacements.runnerSha256,sha("scripts/run-three-replacements.mjs"));
  assert.equal(replacements.graderSha256,remainingAudit.runnerSha256);
  assert.equal(replacements.serviceGraderSha256,sha("scripts/replay-remaining-service-coverage.mjs"));
  assert.equal(replacements.policySha256,remainingAudit.policy.sha256);
  assert.equal(replacements.providerCallsMadeByPreparation,0);
  assert.equal(replacements.maxConcurrent,6);assert.equal(replacements.maxProviderCalls,3);
  assert.deepEqual(replacements.slots.map(({id,trial,replacesTrial,target})=>({id,trial,replacesTrial,target})),disposition.replacementSlots);
  assert.deepEqual(replacements.packages,disposition.packages.filter(p=>p.remaining>0));
  const voidCount=disposition.packages.reduce((n,p)=>n+p.voidAttempts.length,0);
  assert.equal(disposition.totals.gradingVoids,voidCount);
  assert.equal(disposition.totals.countedTrials,allOriginals.filter(p=>p.reward!==null).length-voidCount);
  assert.equal(disposition.totals.effectiveFailures,remainingAudit.successorTotals.effectiveFailures-voidCount);
  assert.equal(disposition.totals.effectivePasses,remainingAudit.successorTotals.effectivePasses);
  assert.equal(disposition.totals.countedTrials,disposition.totals.effectiveFailures+disposition.totals.effectivePasses);
  assert.equal(disposition.totals.completedFinalistsMeetingTarget,disposition.packages.filter(p=>p.remaining===0&&p.failures>=5).length);
  assert.equal(disposition.totals.pendingFinalists,replacements.packages.length);
  assert.equal(disposition.totals.remainingReplacementAttempts,replacements.slots.length);
  assert(!/\/Users\/|\.local\//.test(JSON.stringify(remainingAudit)),"Nonportable audit evidence");
  successorRecords.push(...latestOriginals);
  retrialVerifiedFiles += postFinalFiles;
  const threeReplacements = read("reports/screening/evidence/2026-09-09-three-replacements.json");
  assert.equal(threeReplacements.gradingRevision, "remaining-pass-coverage-v3");
  assert.equal(threeReplacements.automaticRetries, 0);
  assert.equal(threeReplacements.maxProviderCallsAuthorized, 3);
  assert.equal(threeReplacements.providerCallsMade, 3);
  assert.equal(threeReplacements.concurrencyCap, 6);
  assert.equal(threeReplacements.packages.length, 2);
  assert.deepEqual(
    threeReplacements.packages.map((p) => p.id).sort(),
    replacements.packages.map((p) => p.id).sort(),
  );
  let threeReplacementsFiles = 0;
  let threeReplacementsBytes = 0;
  let threeReplacementsAttempts = 0;
  for (const record of threeReplacements.packages) {
    const plan = disposition.packages.find((p) => p.id === record.id);
    assert.ok(plan, "three-replacements result must extend a package with pending replacements");
    assert.ok(readFileSync(join(root, record.analysis), "utf8").includes("remaining-pass-coverage-v3 replacement"));
    assert.deepEqual(record.previousCountedAttempts, plan.countedAttempts);
    assert.deepEqual(record.voidAttempts, plan.voidAttempts);
    let failures = plan.failures;
    let scored = plan.scored;
    for (const a of record.attempts) {
      threeReplacementsAttempts++;
      assert([0, 1].includes(a.recordedReward));
      assert.ok(
        plan.voidAttempts.some((v) => v.trial === a.replacesTrial),
        `${record.id} Trial ${a.trial} must replace a voided trial`,
      );
      assert.equal(a.checker.pass, a.checker.correct === a.checker.total && a.checker.missed === 0 && a.checker.falsePositives === 0);
      assert.equal(a.supplement.pass, a.supplement.deterministic && a.supplement.exactTokens && a.supplement.correct === a.supplement.total);
      assert.equal(a.serviceSupplement.pass, a.serviceSupplement.details.every((d) => d.pass));
      assert.equal(a.effectiveReward, Math.min(a.recordedReward, a.supplement.pass && a.serviceSupplement.pass ? 1 : 0));
      scored++;
      if (a.effectiveReward === 0) failures++;
      assert.equal(a.cumulativeCountedFailures, failures);
      assert.equal(a.cumulativeCountedScored, scored);
      for (const key of ["completionSha256", "resultSha256", "gradeSha256", "packageDigest", "profileDigest"])
        assert.match(a[key], hash, `${record.id} Trial ${a.trial}: ${key}`);
      assert.ok(a.manifestFilesVerified > 0 && a.manifestBytesVerified > 0);
      threeReplacementsFiles += a.manifestFilesVerified;
      threeReplacementsBytes += a.manifestBytesVerified;
    }
    assert.equal(scored, 6, `${record.id}: three-replacements campaign must close a complete six-run set`);
    assert.equal(record.finalCountedFailures, failures);
    assert.equal(record.finalCountedScored, scored);
    if (record.classification === "meets-5-of-6") assert.ok(failures >= 5);
    else if (record.classification === "cannot-reach-5-of-6") assert.ok(failures < 5);
    else assert.equal(record.classification, "unresolved-infrastructure");
    assert.ok(!/\/Users\/|\.local\//.test(JSON.stringify(record)), "nonportable/private three-replacements record");
  }
  assert.equal(threeReplacementsAttempts, 3);
  assert.equal(threeReplacements.audit.manifestFilesVerified, threeReplacementsFiles);
  assert.equal(threeReplacements.audit.manifestBytesVerified, threeReplacementsBytes);
  assert.equal(threeReplacements.audit.newModelCalls, 0);
  assert.deepEqual(threeReplacements.audit.errors, []);
  assert.deepEqual(
    threeReplacements.classificationSummary.meetsFiveOfSix.sort(),
    ["variant-cache-repair", "snapshot-recovery-repair"].sort(),
  );
  assert.deepEqual(threeReplacements.classificationSummary.cannotReachFiveOfSix, []);
  assert.deepEqual(threeReplacements.classificationSummary.unresolvedInfrastructure, []);
  successorRecords.push(
    ...threeReplacements.packages.flatMap((p) =>
      p.attempts.map((a) => ({ id: p.id, reward: a.recordedReward, target: a.target, ...a })),
    ),
  );
  retrialVerifiedFiles += threeReplacementsFiles;
  // The front-facing result is derived from counted attempts, including explicit
  // void disposition. Historical campaign summaries retain their original scope.
  const finalResults = read("reports/screening/evidence/2026-09-09-final-results.json");
  for (const source of finalResults.sources) assert.equal(source.sha256, sha(source.path));
  assert.deepEqual(finalResults.sources.map((s) => s.path), [
    "reports/screening/evidence/2026-09-09-three-replacement-disposition.json",
    "reports/screening/evidence/2026-09-09-three-replacements.json",
  ]);
  assert.deepEqual(finalResults.target, threeReplacements.acceptanceTarget);
  assert.deepEqual(finalResults.packages.map((p) => p.id).sort(), disposition.packages.map((p) => p.id).sort());
  const originalPreparation = read("reports/screening/evidence/2026-09-09-round-three-failing-five-preparation.json");
  for (const p of finalResults.packages) {
    const base = disposition.packages.find((b) => b.id === p.id);
    const fresh = threeReplacements.packages.find((b) => b.id === p.id);
    const counted = [...base.countedAttempts, ...(fresh?.attempts ?? []).map((a) => ({
      trial: a.trial, provider: a.target, recordedReward: a.recordedReward,
      auditEffectiveReward: a.effectiveReward, countedReward: a.effectiveReward, replacesTrial: a.replacesTrial,
    }))].sort((a, b) => a.trial - b.trial);
    assert.deepEqual(p.countedAttempts, counted);
    assert.deepEqual(p.voidAttempts, base.voidAttempts);
    assert.equal(p.analysis, base.analysis);
    assert.equal(p.packageDigest, originalPreparation.packages.find((b) => b.id === p.id).foundry.digest);
    assert.equal(new Set(counted.map((a) => a.trial)).size, 6);
    assert.equal(p.scored, counted.length);
    assert.equal(p.failures, counted.filter((a) => a.countedReward === 0).length);
    assert(!counted.some((a) => p.voidAttempts.some((v) => v.trial === a.trial)), "void counted twice");
    const providers = Object.fromEntries(["codex", "claude"].map((provider) => [provider, counted.filter((a) => a.provider === provider).length]));
    assert.deepEqual(p.attemptsByProvider, providers);
    assert.deepEqual(providers, { codex: 3, claude: 3 });
    for (const a of fresh?.attempts ?? []) {
      const slot = replacements.slots.find((s) => s.id === p.id && s.trial === a.trial);
      assert(slot, "fresh trial must occupy an authorized slot");
      for (const key of ["target", "replacesTrial", "packageDigest", "profileDigest"]) assert.equal(a[key], slot[key]);
    }
    const analysis = readFileSync(join(root, p.analysis), "utf8");
    assert(analysis.includes(`Final counted result: ${p.failures}/6 reward=0`), "stale task result pointer");
  }
  const finalSummary = {
    packages: finalResults.packages.length,
    sixOfSix: finalResults.packages.filter((p) => p.failures === 6).length,
    fiveOfSix: finalResults.packages.filter((p) => p.failures === 5).length,
    countedTrials: finalResults.packages.reduce((n, p) => n + p.scored, 0),
    zeroRewards: finalResults.packages.reduce((n, p) => n + p.failures, 0),
    oneRewards: finalResults.packages.reduce((n, p) => n + p.scored - p.failures, 0),
    codexTrials: finalResults.packages.reduce((n, p) => n + p.attemptsByProvider.codex, 0),
    claudeTrials: finalResults.packages.reduce((n, p) => n + p.attemptsByProvider.claude, 0),
    pendingTrials: finalResults.packages.reduce((n, p) => n + 6 - p.scored, 0),
    gradingVoids: voidCount,
  };
  assert.deepEqual(finalResults.summary, finalSummary);
  const finalCampaignTotals = {
    originalScreenedPackages: ids.size,
    successorAttempts: successorRecords.length,
    successorRawGrades: successorRecords.filter((p) => p.reward !== null).length,
    successorCountedTrials: disposition.totals.countedTrials + threeReplacementsAttempts,
    successorZeroRewards: disposition.totals.effectiveFailures + threeReplacements.packages.reduce((n,p) => n + p.attempts.filter((a) => a.effectiveReward === 0).length, 0),
    successorOneRewards: disposition.totals.effectivePasses + threeReplacements.packages.reduce((n,p) => n + p.attempts.filter((a) => a.effectiveReward === 1).length, 0),
    gradingVoids: voidCount,
    infrastructureInterruptions: successorRecords.filter((p) => p.reward === null).length,
    publishedCampaignEntries: ids.size + successorRecords.length,
  };
  assert.deepEqual(finalResults.campaignTotals, finalCampaignTotals);
  const successorPackageIds = new Set(successorRecords.map((p) => p.id));
  const scoredPackageIds = new Set(successorRecords.filter((p) => p.reward !== null).map((p) => p.id));
  assert.deepEqual([...successorPackageIds].sort(), [...ids].sort(), "every package has a Trial 2 record");
  assert.deepEqual([...scoredPackageIds].sort(), [...ids].sort(), "every package has a scored Trial 2 result");
  // The later public 3.0.0 campaign is separate from the completed finalist sets.
  // Preserve raw grades while enforcing the explicitly authorized Browser void.
  const browserDisposition = read("reports/screening/evidence/2026-09-11-browser-round-four-disposition.json");
  const browserCoverage = read("reports/screening/evidence/2026-09-11-browser-coverage-v3.json");
  const hardenedRoundFour = read("reports/screening/evidence/2026-09-11-hardened-next-five-trial-four.json");
  const hardenedRoundFive = read("reports/screening/evidence/2026-09-11-hardened-next-five-trial-five-preparation.json");
  assert.equal(browserDisposition.rows.length, 5);
  assert.equal(hardenedRoundFive.packages.length, 5);
  assert.equal(hardenedRoundFive.concurrency, 5);
  assert.equal(hardenedRoundFive.maxProviderCalls, 5);
  assert.equal(hardenedRoundFive.providerCallsMade, 0);
  assert.equal(hardenedRoundFive.runtimeRebuilt, false);
  assert.equal(hardenedRoundFive.providerAssignmentsChanged, false);
  assert.deepEqual(hardenedRoundFive.changedPackages, ["browser-replay-repair"]);
  for (const row of browserDisposition.rows) {
    const original = hardenedRoundFour.packages.find((p) => p.id === row.id);
    const prepared = hardenedRoundFive.packages.find((p) => p.id === row.id);
    assert(original && prepared);
    assert.equal(row.recordedReward, original.reward);
    assert.equal(row.originalCompletion.sha256, original.completionSha256);
    assert.equal(row.provider, original.target);
    assert.equal(prepared.target, original.target);
    assert.equal(prepared.profileDigest, original.profileDigest);
    assert.equal(prepared.historicalTrial, 7);
    assert.equal(prepared.versionAttempt, 5);
    if (row.id === "browser-replay-repair") {
      assert.equal(row.countedReward, null);
      assert.equal(row.recordedReward, 1);
      assert.equal(row.diagnosticReward, 0);
      assert.equal(row.disposition, "grading-void");
      assert.equal(row.replacementHistoricalTrial, 7);
      assert.equal(row.replacementProvider, "codex");
      assert.equal(row.userAuthorizedVoid, true);
      assert.equal(prepared.gradingRevision, "coverage-v3");
      assert.notEqual(prepared.packageDigest, original.packageDigest);
    } else {
      assert.equal(row.countedReward, original.reward);
      assert.equal(row.disposition, "retained");
      assert.equal(prepared.packageDigest, original.packageDigest);
    }
  }
  assert.equal(browserDisposition.separateUnscoredInterruption.historicalTrial, 5);
  assert.equal(browserDisposition.separateUnscoredInterruption.provider, "claude");
  assert.equal(browserDisposition.separateUnscoredInterruption.countedReward, null);
  assert.equal(hardenedRoundFive.browserMissingClaudeSlotStillPending, true);
  const integratedBrowser = browserCoverage.tasks.find((p) => p.id === "browser-replay-repair");
  assert.equal(integratedBrowser.reference.passes, 22);
  assert.equal(integratedBrowser.checker.correct, 14);
  assert.equal(integratedBrowser.savedSubmissionReplay.checker.correct, 12);
  assert.equal(integratedBrowser.savedSubmissionReplay.countedReward, null);
  const hardenedLedger = read("reports/screening/evidence/2026-09-11-hardened-six-counting-ledger.json");
  const hardenedContinuation = read("reports/screening/evidence/2026-09-11-hardened-six-continuation-preparation.json");
  const continuationExpected = makeContinuationPlan(hardenedLedger, hardenedRoundFive);
  for (const key of Object.keys(continuationExpected)) assert.deepEqual(hardenedContinuation[key], continuationExpected[key]);
  const firstRoundReplay = read("reports/screening/evidence/2026-09-11-next-five-coverage-v2.json");
  for (const p of hardenedLedger.packages) {
    for (const row of p.history) {
      assert.equal(createHash("sha256").update(readFileSync(join(root,row.source.path))).digest("hex"),row.source.sha256);
      const original = read(row.source.path).packages.find(x=>x.id===p.id);assert(original);
      assert.equal(original.reward,row.originalReward);assert.equal(original.target,row.provider);
      assert.equal(original.completionSha256,row.completionSha256);
      if (row.versionRound === 1) {
        const replay=firstRoundReplay.tasks.find(x=>x.id===p.id).savedSubmissionReplay;
        assert.equal(replay.originalCompletionSha256,row.completionSha256);
        assert(replay.service.pass&&!replay.checker.pass);
        assert.equal(row.countedReward,replay.replayReward);
      } else if (row.versionRound === 4) {
        assert.equal(row.countedReward,browserDisposition.rows.find(x=>x.id===p.id).countedReward);
      } else assert.equal(row.countedReward,original.reward);
    }
  }
  const allHardenedRows=hardenedLedger.packages.flatMap(p=>p.history);
  assert.equal(allHardenedRows.filter(r=>r.countedReward===0).length,17);
  assert.equal(allHardenedRows.filter(r=>r.countedReward!==null).length,18);
  assert.equal(hardenedContinuation.providerCallsMade,0);
  assert.equal(hardenedContinuation.alreadyRunningRound5Modified,false);
  const routeAudit = read("reports/screening/evidence/2026-09-11-route-trial-seven-pass-audit.json");
  assert.equal(routeAudit.id, "route-policy-repair");
  assert.equal(routeAudit.historicalTrial, 7);
  assert.equal(routeAudit.provider, "codex");
  assert.equal(routeAudit.recordedReward, 1);
  assert.equal(routeAudit.countedReward, 1);
  assert.equal(routeAudit.disposition, "retain-pass");
  assert.equal(routeAudit.providerCallsMade, 0);
  assert.equal(routeAudit.confirmedAdditionalDefects, 0);
  assert.equal(routeAudit.packageDigest, hardenedRoundFive.packages.find(p=>p.id===routeAudit.id).packageDigest);
  const priorRoute = hardenedLedger.packages.find(p=>p.id===routeAudit.id).history.filter(r=>r.countedReward!==null);
  assert.equal(routeAudit.counting.failures, priorRoute.filter(r=>r.countedReward===0).length);
  assert.equal(routeAudit.counting.scored, priorRoute.length + 1);
  assert.equal(routeAudit.counting.passes, routeAudit.counting.scored - routeAudit.counting.failures);
  assert.equal(routeAudit.counting.maximumFailuresInSix, routeAudit.counting.failures + 6 - routeAudit.counting.scored);
  assert.equal(routeAudit.counting.canReachFiveOfSix, routeAudit.counting.maximumFailuresInSix >= 5);
  for (const provider of ["codex", "claude"])
    assert.equal(routeAudit.counting.providers[provider], priorRoute.filter(r=>r.provider===provider).length + Number(provider===routeAudit.provider));
  for (const script of routeAudit.reproduction.scripts) assert.equal(script.sha256, sha(script.path));
  const generatedRoute = routeAudit.audit.generated, targetedRoute = routeAudit.audit.targeted;
  assert.deepEqual(generatedRoute.failures, []);
  assert.deepEqual(targetedRoute.failures, []);
  assert.equal(routeAudit.audit.additionalServiceConfigurations, generatedRoute.serviceChecks + targetedRoute.serviceChecks);
  assert.equal(routeAudit.audit.checkerClassifications, generatedRoute.checkerPositive + generatedRoute.checkerNegative + targetedRoute.checkerCases);
  assert.equal(targetedRoute.classifications.length, targetedRoute.checkerCases);
  assert(targetedRoute.classifications.every(c=>c.correct && c.accepted===c.expectedAccept));
  assert.equal(targetedRoute.isolatedService.passed, targetedRoute.serviceChecks);
  assert.equal(targetedRoute.isolatedChecker.correct, targetedRoute.checkerCases);
  assert(targetedRoute.isolatedChecker.shapeValid && targetedRoute.isolatedChecker.deterministic && targetedRoute.isolatedChecker.inputUnchanged);
  const completedContinuation = read("reports/screening/evidence/2026-09-11-hardened-six-continuation.json");
  const currentFinalResults = read("reports/screening/evidence/2026-09-11-final-results.json");
  assert.deepEqual(currentFinalResults.target, { minimumFailures: 5, countedTrials: 6, codexTrials: 3, claudeTrials: 3 });
  assert.deepEqual(currentFinalResults.sources.map(s => s.path), [
    "reports/screening/evidence/2026-09-09-final-results.json",
    "reports/screening/evidence/2026-09-11-hardened-six-counting-ledger.json",
    "reports/screening/evidence/2026-09-11-hardened-six-continuation.json",
  ]);
  for (const source of currentFinalResults.sources) assert.equal(source.sha256, sha(source.path));
  const combined = buildFinalResults(finalResults, hardenedLedger, completedContinuation);
  for (const key of Object.keys(combined)) assert.deepEqual(currentFinalResults[key], combined[key], `current results: ${key}`);
  assert.equal(completedContinuation.counts.totalNewModelCallsThisSession, combined.latestCampaign.totalAttempts);
  assert.equal(completedContinuation.counts.zeroRewards, combined.latestCampaign.zeroRewards);
  assert.equal(completedContinuation.counts.oneRewards, combined.latestCampaign.oneRewards);
  for (const [id, p] of Object.entries(completedContinuation.packages)) {
    const prepared = hardenedRoundFive.packages.find(p => p.id === id);
    for (const row of p.trials) {
      assert.equal(row.packageDigest, prepared.packageDigest);
      for (const key of ["completionSha256", "resultSha256", "packageDigest", "profileDigest"]) assert.match(row[key], hash);
      assert(row.manifestFilesVerified > 0 && row.manifestBytesVerified > 0);
      assert.equal(row.serviceOutcome, "semantic-pass");
      assert.equal(row.reward, row.checkerPassed ? 1 : 0);
    }
  }
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
    "docs/post-final-five-handoff.md",
    "docs/three-replacements-handoff.md",
    "docs/hardened-next-five-trial-one-handoff.md",
    "docs/hardened-next-five-trial-two-handoff.md",
    "docs/hardened-next-five-trial-three-handoff.md",
    "docs/hardened-next-five-trial-four-handoff.md",
    "docs/hardened-next-five-trial-five-handoff.md",
    "docs/hardened-six-continuation-handoff.md",
    "docs/hardened-next-five-trial-three-browser-retry-handoff.md",
    "docs/next-five-implementation.md",
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
    hardenedPreRoundFiveCountedZeroes: 17,
    hardenedPreRoundFiveCountedTrials: 18,
    hardenedContinuationMaxFurtherCalls: hardenedContinuation.maxNewProviderCalls,
    hardenedRoundFourCountedTrials: browserDisposition.rows.filter((r) => r.countedReward !== null).length,
    hardenedRoundFourCountedZeroes: browserDisposition.rows.filter((r) => r.countedReward === 0).length,
    hardenedRoundFourRetainedPasses: browserDisposition.rows.filter((r) => r.countedReward === 1).length,
    hardenedRoundFourGradingVoids: browserDisposition.rows.filter((r) => r.countedReward === null).length,
    hardenedRoundFivePreparedAttempts: hardenedRoundFive.packages.length,
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
    postFinalAdditionalFalsePasses: postCorrections.length,
    postFinalRegradedAttempts: postAudit.rows.length,
    postFinalReopenedPackages: postAudit.classifications.filter(p => p.classification === "reopened").length,
    postFinalFiveFailuresPendingBalance: postAudit.classifications.filter(p => p.failures >= 5 && p.scored < 6).length,
    postFinalRemainingSlots: postAudit.classifications.reduce((n, p) => n + p.remaining, 0),
    postFinalFiveAttemptsMade: postFinalAttempts,
    postFinalFiveMeetsFiveOfSix: postFinal.classificationSummary.meetsFiveOfSix.length,
    postFinalFiveCannotReachFiveOfSix: postFinal.classificationSummary.cannotReachFiveOfSix.length,
    postFinalFiveUnresolvedInfrastructure: postFinal.classificationSummary.unresolvedInfrastructure.length,
    successorEffectiveZeroRewards: disposition.totals.effectiveFailures + threeReplacements.packages.reduce((n, p) => n + p.attempts.filter((a) => a.effectiveReward === 0).length, 0),
    successorEffectivePasses: disposition.totals.effectivePasses + threeReplacements.packages.reduce((n, p) => n + p.attempts.filter((a) => a.effectiveReward === 1).length, 0),
    successorCountedTrials: disposition.totals.countedTrials + threeReplacementsAttempts,
    successorGradingVoids: disposition.totals.gradingVoids,
    remainingAuditAdditionalFalsePasses: remainingAudit.correctedPasses.length,
    completedFinalistsMeetingTarget: combined.summary.packages,
    pendingFinalists: combined.summary.pendingFinalistTrials,
    finalistCountedTrials: combined.summary.countedTrials,
    finalistZeroRewards: combined.summary.zeroRewards,
    finalistsAtSixOfSix: combined.summary.sixOfSix,
    finalistsAtFiveOfSix: combined.summary.fiveOfSix,
    newlyQualifiedFinalists: combined.summary.newlyQualifiedPackages,
    latestCampaignAttempts: combined.latestCampaign.totalAttempts,
    latestCampaignZeroRewards: combined.latestCampaign.zeroRewards,
    latestContinuationAttempts: combined.latestCampaign.continuationAttempts,
    publishedScreeningCampaignEntries: finalCampaignTotals.publishedCampaignEntries,
    preparedReplacementAttempts: replacements.slots.length,
    threeReplacementsAttemptsMade: threeReplacementsAttempts,
    threeReplacementsMeetsFiveOfSix: threeReplacements.classificationSummary.meetsFiveOfSix.length,
    threeReplacementsCannotReachFiveOfSix: threeReplacements.classificationSummary.cannotReachFiveOfSix.length,
    threeReplacementsUnresolvedInfrastructure: threeReplacements.classificationSummary.unresolvedInfrastructure.length,
    allFinalistsMeetingTargetAfterReplacements:
      disposition.totals.completedFinalistsMeetingTarget + threeReplacements.classificationSummary.meetsFiveOfSix.length,
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
